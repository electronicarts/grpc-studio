// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { RawData, WebSocket } from 'ws'
import { MethodKind, type InvokeStreamClientMessage, type InvokeStreamStartPayload, type JsonValue } from '@grpc-studio/shared'
import configManager from '../config/configManager.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import defaultGrpcMethodInvokerService, { type GrpcMethodInvokerService } from '../services/grpcMethodInvokerService.js'
import type { FormattedGrpcError, StreamCallbacks, StreamHandle, UserContext } from '../types/index.js'
import logger from '../utils/logger.js'
import { StreamRequestQueue } from './streamRequestQueue.js'
import * as websocketProtocol from './websocketProtocol.js'

const connectionLogger = logger.child({ module: 'websocket-connection' })

interface WebSocketConnectionOptions {
  connectionId: string
  ws: WebSocket
  userContext?: UserContext
  maxMessageSize?: number
  grpcMethodInvokerService?: GrpcMethodInvokerService
}

type ActiveStream = ServerStream | WritableStream

interface StreamBase {
  readonly service: string
  readonly method: string
  readonly generation: number
  handle: StreamHandle | null
}

interface ServerStream extends StreamBase {
  readonly kind: typeof MethodKind.SERVER_STREAMING
  readonly request: JsonValue | undefined
}

interface WritableStream extends StreamBase {
  readonly kind: typeof MethodKind.CLIENT_STREAMING | typeof MethodKind.BIDI_STREAMING
  readonly requests: StreamRequestQueue<JsonValue>
}

export class WebSocketConnection {
  readonly connectionId: string
  readonly ws: WebSocket

  private activeStream: ActiveStream | null = null
  private streamGeneration = 0
  private readonly userContext: UserContext | null
  private readonly maxMessageSize: number
  private readonly grpcMethodInvokerService: GrpcMethodInvokerService

  constructor(options: WebSocketConnectionOptions) {
    this.connectionId = options.connectionId
    this.ws = options.ws
    this.userContext = options.userContext ?? null
    this.maxMessageSize = options.maxMessageSize ?? configManager.getServerConfig().websocket.maxPayloadBytes
    this.grpcMethodInvokerService = options.grpcMethodInvokerService ?? defaultGrpcMethodInvokerService
  }

  open(): void {
    this.ws.on('message', (rawFrame) => {
      this.receiveClientFrame(rawFrame).catch((error) => {
        connectionLogger.error('Uncaught error in message handler', {
          connectionId: this.connectionId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      })
    })
  }

  close(): void {
    this.cancelActiveStream()
  }

  async handleClientMessage(message: InvokeStreamClientMessage): Promise<void> {
    switch (message.type) {
      case 'ping':
        websocketProtocol.sendPong(this.ws)
        return

      case 'start':
        await this.startBackendStream(message.payload)
        return

      case 'data':
        this.writeBackendRequest(message.payload)
        return

      case 'end':
        this.endBackendRequests()
        return

      case 'cancel':
        this.cancelActiveStream()
        return
    }
  }

  private async receiveClientFrame(rawFrame: RawData): Promise<void> {
    try {
      const parseResult = websocketProtocol.parseClientMessage(rawFrame, this.maxMessageSize)
      if (!parseResult.ok) {
        if (parseResult.tooLarge) {
          connectionLogger.warn('Message exceeds size limit', { connectionId: this.connectionId })
        }
        websocketProtocol.sendError(this.ws, parseResult.error)
        return
      }

      const messageUserContext = this.getMessageUserContext(parseResult.message)
      try {
        await userContextMiddleware.runWithUserContext(
          messageUserContext,
          () => this.handleClientMessage(parseResult.message)
        )
      } catch (userContextError) {
        connectionLogger.error('Failed to establish user context', {
          connectionId: this.connectionId,
          error: userContextError instanceof Error ? userContextError.message : String(userContextError),
        })
        websocketProtocol.sendError(this.ws, 'Authentication error')
        return
      }
    } catch (error) {
      connectionLogger.error('Error handling WebSocket message', {
        connectionId: this.connectionId,
        error: error instanceof Error ? error.message : String(error),
      })
      websocketProtocol.sendError(this.ws, error instanceof Error ? error.message : String(error))
    }
  }

  private getMessageUserContext(message: InvokeStreamClientMessage): UserContext | null {
    if (this.userContext?.authenticated) return this.userContext
    if (message.type !== 'start') return this.userContext

    return userContextMiddleware.getUserContextFromStreamPayload(message.payload) ?? this.userContext
  }

  private async startBackendStream(payload: InvokeStreamStartPayload): Promise<void> {
    this.cancelActiveStream()

    const generation = ++this.streamGeneration
    const stream = createActiveStream(payload, generation)
    this.activeStream = stream

    connectionLogger.info('Starting gRPC stream', {
      connectionId: this.connectionId,
      service: stream.service,
      method: stream.method,
      methodKind: stream.kind,
      generation,
    })

    try {
      const handle = await this.openBackendStream(stream)
      // Check if stream was cancelled while opening (using generation instead of object identity)
      if (stream.generation !== this.streamGeneration) {
        connectionLogger.debug('Stream cancelled during startup', {
          connectionId: this.connectionId,
          generation: stream.generation,
          currentGeneration: this.streamGeneration,
        })
        handle.cancel()
        return
      }

      stream.handle = handle
    } catch (error) {
      connectionLogger.error('Failed to initialize backend stream', {
        connectionId: this.connectionId,
        service: stream.service,
        method: stream.method,
        methodKind: stream.kind,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Check generation before cleanup
      if (stream.generation !== this.streamGeneration) return

      this.finishStream(stream)
      const errorMessage = `Failed to start stream: ${error instanceof Error ? error.message : 'Unknown error'}`
      websocketProtocol.sendError(this.ws, errorMessage)
    }
  }

  private openBackendStream(stream: ActiveStream): Promise<StreamHandle> {
    const callbacks = this.createBackendResponseHandlers(stream)

    switch (stream.kind) {
      case MethodKind.SERVER_STREAMING:
        return this.grpcMethodInvokerService.invokeServerStream(
          stream.service,
          stream.method,
          stream.request,
          callbacks
        )

      case MethodKind.CLIENT_STREAMING:
        return this.grpcMethodInvokerService.invokeClientStream(
          stream.service,
          stream.method,
          stream.requests,
          callbacks
        )

      case MethodKind.BIDI_STREAMING:
        return this.grpcMethodInvokerService.invokeBidiStream(
          stream.service,
          stream.method,
          stream.requests,
          callbacks
        )
    }
  }

  private writeBackendRequest(data: JsonValue): void {
    if (!isWritableStream(this.activeStream)) {
      websocketProtocol.sendError(this.ws, 'No active stream')
      return
    }

    try {
      this.activeStream.requests.push(data)
    } catch (error) {
      connectionLogger.error('Stream queue overflow', {
        connectionId: this.connectionId,
        service: this.activeStream.service,
        method: this.activeStream.method,
        error: error instanceof Error ? error.message : String(error),
      })
      websocketProtocol.sendError(this.ws, 'Stream queue at capacity - too many messages')
    }
  }

  private endBackendRequests(): void {
    if (isWritableStream(this.activeStream)) {
      this.activeStream.requests.close()
    }
  }

  private cancelActiveStream(): void {
    const stream = this.activeStream
    this.activeStream = null

    if (!stream) return

    closeRequestSide(stream)
    stream.handle?.cancel()
  }

  private createBackendResponseHandlers(stream: ActiveStream): StreamCallbacks {
    return {
      onData: (data) => {
        if (this.activeStream === stream) {
          websocketProtocol.sendResponse(this.ws, data)
        }
      },
      onEnd: () => {
        if (this.activeStream === stream) {
          websocketProtocol.sendComplete(this.ws)
        }
        this.finishStream(stream)
      },
      onError: (error) => {
        if (this.activeStream === stream) {
          websocketProtocol.sendError(this.ws, formatGrpcError(error))
        }
        this.finishStream(stream)
      },
    }
  }

  private finishStream(stream: ActiveStream): void {
    closeRequestSide(stream)

    if (this.activeStream === stream) {
      this.activeStream = null
    }
  }
}

function createActiveStream(payload: InvokeStreamStartPayload, generation: number): ActiveStream {
  if (payload.methodKind === MethodKind.SERVER_STREAMING) {
    return {
      service: payload.service,
      method: payload.method,
      kind: MethodKind.SERVER_STREAMING,
      generation,
      request: payload.data,
      handle: null,
    }
  }

  const requests = new StreamRequestQueue<JsonValue>()
  if (payload.data !== undefined) {
    requests.push(payload.data)
  }

  return {
    service: payload.service,
    method: payload.method,
    kind: payload.methodKind,
    generation,
    requests,
    handle: null,
  }
}

function isWritableStream(stream: ActiveStream | null): stream is WritableStream {
  return stream?.kind === MethodKind.CLIENT_STREAMING || stream?.kind === MethodKind.BIDI_STREAMING
}

function closeRequestSide(stream: ActiveStream): void {
  if (isWritableStream(stream)) {
    stream.requests.close()
  }
}

function formatGrpcError(error: FormattedGrpcError): string {
  return error.formatted ?? error.message ?? 'Unknown gRPC error'
}
