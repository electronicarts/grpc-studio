// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { JsonValue } from '@grpc-studio/shared'
import type {
  DescMethod,
  DescMethodBiDiStreaming,
  DescMethodClientStreaming,
  DescMethodServerStreaming,
  DescMethodUnary,
} from '@bufbuild/protobuf'
import headerManager from '../headers/headerManager.js'
import connectTransportProvider, { type ConnectTransportProvider } from '../grpc/connect/connectTransport.js'
import { ConnectInvoker, formatConnectError, type RequestStream } from '../grpc/connect/connectInvoker.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import reflectionSchemaRepository, { type ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import type { StreamCallbacks, StreamHandle, UnaryResult } from '../types/index.js'
import { instrumentUnaryCall, instrumentStreamCall } from '../grpc/instrumentation/grpcInstrumentation.js'
import logger from '../utils/logger.js'

const invokerLogger = logger.child({ module: 'grpc-method-invoker-service' })
const VALID_NAME_RE = /^[a-zA-Z_][\w.]*$/

export class GrpcMethodInvokerService {
  constructor(
    private readonly schemaRepository: Pick<ReflectionSchemaRepository, 'getFileRegistry'> = reflectionSchemaRepository,
    private readonly transportProvider: ConnectTransportProvider = connectTransportProvider,
    private readonly connectInvoker: ConnectInvoker = new ConnectInvoker(transportProvider)
  ) {}

  close(): void {
    this.transportProvider.close()
  }

  async invokeUnary(serviceName: string, methodName: string, request: JsonValue | undefined): Promise<UnaryResult> {
    return instrumentUnaryCall(serviceName, methodName, async () => {
      try {
        // Use global descriptor set so Any fields can contain types from any reflected service
        const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet()
        const method = await this.resolveMethod(serviceName, methodName)
        assertUnaryMethod(method)
        const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
        return {
          success: true,
          data: await this.connectInvoker.invokeUnary(method, request, headers, fileDescriptorSet),
          completedAtMs: Date.now(),
        }
      } catch (error) {
        const formatted = formatConnectError(error)
        invokerLogger.error('Unary call failed', { error: formatted.message, code: formatted.code })
        return { success: false, error: formatted.formatted, completedAtMs: Date.now() }
      }
    })
  }

  async invokeServerStream(
    serviceName: string,
    methodName: string,
    request: JsonValue | undefined,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'server_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet()
        const method = await this.resolveMethod(serviceName, methodName)
        assertServerStreamingMethod(method)
        const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
        return await this.connectInvoker.startServerStream(method, request, wrappedCallbacks, headers, fileDescriptorSet)
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  async invokeClientStream(
    serviceName: string,
    methodName: string,
    requests: RequestStream,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'client_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet()
        const method = await this.resolveMethod(serviceName, methodName)
        assertClientStreamingMethod(method)
        const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
        return await this.connectInvoker.startClientStream(method, requests, wrappedCallbacks, headers, fileDescriptorSet)
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  async invokeBidiStream(
    serviceName: string,
    methodName: string,
    requests: RequestStream,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'bidi_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet()
        const method = await this.resolveMethod(serviceName, methodName)
        assertBidiStreamingMethod(method)
        const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
        return await this.connectInvoker.startBidiStream(method, requests, wrappedCallbacks, headers, fileDescriptorSet)
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  private async resolveMethod(serviceName: string, methodName: string): Promise<DescMethod> {
    validateMethodNames(serviceName, methodName)

    const registry = await this.schemaRepository.getFileRegistry(serviceName)
    const service = registry.getService(serviceName)
    if (!service) throw new Error(`Service ${serviceName} not found in registry`)

    const method = service.methods.find(m => m.name === methodName)
    if (!method) throw new Error(`Method ${methodName} not found on service ${serviceName}`)

    return method
  }
}

function validateMethodNames(serviceName: string, methodName: string): void {
  if (!VALID_NAME_RE.test(serviceName)) throw new Error(`Invalid service name: ${serviceName}`)
  if (!VALID_NAME_RE.test(methodName)) throw new Error(`Invalid method name: ${methodName}`)
}

function noopStreamHandle(): StreamHandle {
  return { cancel: () => {} }
}

function assertUnaryMethod(method: DescMethod): asserts method is DescMethodUnary {
  assertMethodKind(method, 'unary')
}

function assertServerStreamingMethod(method: DescMethod): asserts method is DescMethodServerStreaming {
  assertMethodKind(method, 'server_streaming')
}

function assertClientStreamingMethod(method: DescMethod): asserts method is DescMethodClientStreaming {
  assertMethodKind(method, 'client_streaming')
}

function assertBidiStreamingMethod(method: DescMethod): asserts method is DescMethodBiDiStreaming {
  assertMethodKind(method, 'bidi_streaming')
}

function assertMethodKind(
  method: DescMethod,
  methodKind: DescMethod['methodKind']
): void {
  if (method.methodKind !== methodKind) {
    throw new Error(`Method ${method.parent.typeName}/${method.name} is ${method.methodKind}, not ${methodKind}`)
  }
}

export default new GrpcMethodInvokerService()
