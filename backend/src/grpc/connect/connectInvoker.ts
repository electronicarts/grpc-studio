// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import {
  fromJson,
  toJson,
  type DescMessage,
  type DescMethod,
  type DescMethodBiDiStreaming,
  type DescMethodClientStreaming,
  type DescMethodServerStreaming,
  type DescMethodUnary,
  type JsonValue as BufJsonValue,
  type MessageInitShape,
} from '@bufbuild/protobuf'
import { Code, ConnectError, createClient, type CallOptions } from '@connectrpc/connect'
import type { JsonValue } from '@grpc-studio/shared'
import configManager from '../../config/configManager.js'
import type { FormattedGrpcError, StreamCallbacks, StreamHandle } from '../../types/index.js'
import connectTransportProvider, { type ConnectTransportProvider } from './connectTransport.js'

type UnaryClientMethod = (
  request: MessageInitShape<DescMessage>,
  options?: CallOptions
) => Promise<unknown>

type ServerStreamingClientMethod = (
  request: MessageInitShape<DescMessage>,
  options?: CallOptions
) => AsyncIterable<unknown>

type ClientStreamingClientMethod = (
  request: AsyncIterable<MessageInitShape<DescMessage>>,
  options?: CallOptions
) => Promise<unknown>

type BidiStreamingClientMethod = (
  request: AsyncIterable<MessageInitShape<DescMessage>>,
  options?: CallOptions
) => AsyncIterable<unknown>

type ReflectedClient = Record<string, unknown>

export type RequestStream = AsyncIterable<JsonValue>
export type OutboundHeaders = Record<string, string>

export class ConnectInvoker {
  constructor(private readonly transportProvider: ConnectTransportProvider = connectTransportProvider) {}

  async invokeUnary(method: DescMethodUnary, request: JsonValue | undefined, headers: OutboundHeaders): Promise<JsonValue> {
    const response = await this.getClientMethod<UnaryClientMethod>(method)(
      toProtoRequest(method.input, request),
      this.buildCallOptions(configManager.getClientConfig().rpc.unaryDeadlineMs, headers)
    )

    return toJsonResponse(method.output, response)
  }

  async startServerStream(
    method: DescMethodServerStreaming,
    request: JsonValue | undefined,
    callbacks: StreamCallbacks,
    headers: OutboundHeaders
  ): Promise<StreamHandle> {
    return this.startResponseStream(
      callbacks,
      async (signal) => this.getClientMethod<ServerStreamingClientMethod>(method)(
        toProtoRequest(method.input, request),
        this.buildCallOptions(configManager.getClientConfig().rpc.streamDeadlineMs, headers, signal)
      ),
      method.output
    )
  }

  async startClientStream(
    method: DescMethodClientStreaming,
    requests: RequestStream,
    callbacks: StreamCallbacks,
    headers: OutboundHeaders
  ): Promise<StreamHandle> {
    const abortController = new AbortController()

    this.pumpClientStream(method, requests, callbacks, headers, abortController.signal)
      .catch((error) => {
        // Catch unhandled errors from pump to prevent unhandled promise rejections
        if (!abortController.signal.aborted) {
          callbacks.onError(formatConnectError(error))
        }
      })

    return {
      cancel: () => {
        abortController.abort()
      },
    }
  }

  async startBidiStream(
    method: DescMethodBiDiStreaming,
    requests: RequestStream,
    callbacks: StreamCallbacks,
    headers: OutboundHeaders
  ): Promise<StreamHandle> {
    return this.startResponseStream(
      callbacks,
      async (signal) => this.getClientMethod<BidiStreamingClientMethod>(method)(
        toConnectRequestStream(method, requests),
        this.buildCallOptions(configManager.getClientConfig().rpc.streamDeadlineMs, headers, signal)
      ),
      method.output
    )
  }

  private startResponseStream(
    callbacks: StreamCallbacks,
    createStream: (signal: AbortSignal) => Promise<AsyncIterable<unknown>>,
    responseDesc: DescMessage
  ): StreamHandle {
    const abortController = new AbortController()

    this.pumpResponseStream(createStream, responseDesc, callbacks, abortController.signal)
      .catch((error) => {
        // Catch unhandled errors from pump to prevent unhandled promise rejections
        if (!abortController.signal.aborted) {
          callbacks.onError(formatConnectError(error))
        }
      })

    return {
      cancel: () => {
        abortController.abort()
      },
    }
  }

  private async pumpResponseStream(
    createStream: (signal: AbortSignal) => Promise<AsyncIterable<unknown>>,
    responseDesc: DescMessage,
    callbacks: StreamCallbacks,
    signal: AbortSignal
  ): Promise<void> {
    try {
      const stream = await createStream(signal)

      for await (const message of stream) {
        callbacks.onData(toJsonResponse(responseDesc, message))
      }

      callbacks.onEnd()
    } catch (error) {
      if (!signal.aborted) {
        callbacks.onError(formatConnectError(error))
      }
    }
  }

  private async pumpClientStream(
    method: DescMethodClientStreaming,
    requests: RequestStream,
    callbacks: StreamCallbacks,
    headers: OutboundHeaders,
    signal: AbortSignal
  ): Promise<void> {
    try {
      const response = await this.getClientMethod<ClientStreamingClientMethod>(method)(
        toConnectRequestStream(method, requests),
        this.buildCallOptions(configManager.getClientConfig().rpc.streamDeadlineMs, headers, signal)
      )

      callbacks.onData(toJsonResponse(method.output, response))
      callbacks.onEnd()
    } catch (error) {
      if (!signal.aborted) {
        callbacks.onError(formatConnectError(error))
      }
    }
  }

  private buildCallOptions(timeoutMs: number, headers: OutboundHeaders, signal?: AbortSignal): CallOptions {
    return {
      signal,
      timeoutMs,
      headers,
    }
  }

  private getClientMethod<ClientMethod>(method: DescMethod): ClientMethod {
    const client = createClient(method.parent, this.transportProvider.getTransport()) as unknown as ReflectedClient
    const clientMethod = client[method.localName]
    if (typeof clientMethod !== 'function') {
      throw new Error(`Method ${method.parent.typeName}/${method.name} was not present on the reflected Connect client`)
    }

    return clientMethod as ClientMethod
  }
}

export function formatConnectError(error: unknown): FormattedGrpcError {
  const connectError = ConnectError.from(error)
  const codeName = Code[connectError.code] ?? 'Unknown'
  const message = connectError.rawMessage || connectError.message || 'Unknown error'
  return {
    code: connectError.code,
    codeName,
    message,
    formatted: `gRPC ${codeName}: ${message}`,
  }
}

function toProtoRequest(desc: DescMessage, data: JsonValue | undefined): MessageInitShape<DescMessage> {
  return fromJson(desc, (data ?? {}) as BufJsonValue, { ignoreUnknownFields: true }) as MessageInitShape<DescMessage>
}

function toJsonResponse(desc: DescMessage, message: unknown): JsonValue {
  return toJson(desc, message as never, { alwaysEmitImplicit: true, useProtoFieldName: true }) as JsonValue
}

async function* toConnectRequestStream(
  method: DescMethod,
  requests: RequestStream
): AsyncIterable<MessageInitShape<DescMessage>> {
  for await (const request of requests) {
    yield toProtoRequest(method.input, request)
  }
}
