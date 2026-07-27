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
import { ConnectInvoker, formatConnectError, type RequestStream } from '../grpc/connect/connectInvoker.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import reflectionSchemaRepository, { type ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import multiClientManager from '../grpc/multiClientManager.js'
import type { StreamCallbacks, StreamHandle, UnaryResult } from '../types/index.js'
import { instrumentUnaryCall, instrumentStreamCall } from '../grpc/instrumentation/grpcInstrumentation.js'
import { AppError } from '../errors/AppError.js'
import logger from '../utils/logger.js'

const invokerLogger = logger.child({ module: 'grpc-method-invoker-service' })
const VALID_NAME_RE = /^[a-zA-Z_][\w.]*$/

// Connect status codes that indicate a transport-level failure worth retrying on a
// fresh connection (as opposed to an application-level gRPC error the server returned).
const RETRYABLE_CONNECT_CODES = new Set(['UNAVAILABLE', 'DEADLINE_EXCEEDED'])

// Node network error codes that surface as plain Error messages when the TCP/TLS layer
// fails before Connect can assign a status code. Matched as whole tokens to avoid the
// false positives a substring like 'connection' would cause.
const RETRYABLE_NETWORK_CODES = /\b(ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH|ENETUNREACH|EPIPE|ETIMEDOUT)\b/

function isRetryableConnectionError(codeName: string, errorMessage: string): boolean {
  return RETRYABLE_CONNECT_CODES.has(codeName) || RETRYABLE_NETWORK_CODES.test(errorMessage)
}

export class GrpcMethodInvokerService {
  constructor(
    private readonly schemaRepository: Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'> = reflectionSchemaRepository
  ) {}

  close(): void {
    multiClientManager.close()
  }

  /**
   * Retry wrapper that detects stale connections and recreates transport on retry
   */
  private async withConnectionRetry<T>(
    target: string,
    operation: (forceRecreate: boolean) => Promise<T>,
    operationName: string
  ): Promise<T> {
    let attempt = 0
    const maxAttempts = 2

    while (attempt < maxAttempts) {
      attempt++
      const forceRecreate = attempt > 1

      try {
        if (forceRecreate) {
          invokerLogger.info(`Retrying ${operationName} with fresh transport`, { target, attempt })
        }

        return await operation(forceRecreate)
      } catch (error) {
        const formatted = formatConnectError(error)
        const errorMessage = formatted.message || ''
        const codeName = formatted.codeName || ''
        const isConnectionError = isRetryableConnectionError(codeName, errorMessage)

        if (isConnectionError && attempt < maxAttempts) {
          invokerLogger.warn(`${operationName} failed with connection error, will retry with fresh transport`, {
            target,
            error: errorMessage,
            codeName,
            attempt,
          })
          continue // Retry
        }

        // Not a connection error or out of retries - rethrow
        invokerLogger.error(`${operationName} failed`, { target, error: errorMessage, codeName, attempt })
        throw error
      }
    }

    // Should never reach here
    throw new Error('Unexpected error in retry logic')
  }

  async invokeUnary(target: string, serviceName: string, methodName: string, request: JsonValue | undefined): Promise<UnaryResult> {
    return instrumentUnaryCall(serviceName, methodName, async () => {
      try {
        const data = await this.withConnectionRetry(
          target,
          async (forceRecreate) => {
            // Use global descriptor set so Any fields can contain types from any reflected service
            const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet(target)
            const method = await this.resolveMethod(target, serviceName, methodName)
            assertUnaryMethod(method)
            const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
            const transport = multiClientManager.getConnectTransport(target, forceRecreate)
            const connectInvoker = new ConnectInvoker({
              getTransport: () => transport
            })
            return await connectInvoker.invokeUnary(method, request, headers, fileDescriptorSet)
          },
          `unary call ${serviceName}.${methodName}`
        )

        return {
          success: true,
          data,
          completedAtMs: Date.now(),
        }
      } catch (error) {
        const formatted = formatConnectError(error)
        return { success: false, error: formatted.formatted, completedAtMs: Date.now() }
      }
    })
  }

  async invokeServerStream(
    target: string,
    serviceName: string,
    methodName: string,
    request: JsonValue | undefined,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'server_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        return await this.withConnectionRetry(
          target,
          async (forceRecreate) => {
            const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet(target)
            const method = await this.resolveMethod(target, serviceName, methodName)
            assertServerStreamingMethod(method)
            const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
            const transport = multiClientManager.getConnectTransport(target, forceRecreate)
            const connectInvoker = new ConnectInvoker({
              getTransport: () => transport
            })
            return await connectInvoker.startServerStream(method, request, wrappedCallbacks, headers, fileDescriptorSet)
          },
          `server stream ${serviceName}.${methodName}`
        )
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  async invokeClientStream(
    target: string,
    serviceName: string,
    methodName: string,
    requests: RequestStream,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'client_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        return await this.withConnectionRetry(
          target,
          async (forceRecreate) => {
            const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet(target)
            const method = await this.resolveMethod(target, serviceName, methodName)
            assertClientStreamingMethod(method)
            const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
            const transport = multiClientManager.getConnectTransport(target, forceRecreate)
            const connectInvoker = new ConnectInvoker({
              getTransport: () => transport
            })
            return await connectInvoker.startClientStream(method, requests, wrappedCallbacks, headers, fileDescriptorSet)
          },
          `client stream ${serviceName}.${methodName}`
        )
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  async invokeBidiStream(
    target: string,
    serviceName: string,
    methodName: string,
    requests: RequestStream,
    callbacks: StreamCallbacks
  ): Promise<StreamHandle> {
    return instrumentStreamCall(serviceName, methodName, 'bidi_streaming', callbacks, async (wrappedCallbacks) => {
      try {
        return await this.withConnectionRetry(
          target,
          async (forceRecreate) => {
            const fileDescriptorSet = await this.schemaRepository.getAllFileDescriptorSet(target)
            const method = await this.resolveMethod(target, serviceName, methodName)
            assertBidiStreamingMethod(method)
            const headers = await headerManager.getOutboundHeaders(userContextMiddleware.getCurrentUserContext())
            const transport = multiClientManager.getConnectTransport(target, forceRecreate)
            const connectInvoker = new ConnectInvoker({
              getTransport: () => transport
            })
            return await connectInvoker.startBidiStream(method, requests, wrappedCallbacks, headers, fileDescriptorSet)
          },
          `bidi stream ${serviceName}.${methodName}`
        )
      } catch (error) {
        wrappedCallbacks.onError(formatConnectError(error))
        return noopStreamHandle()
      }
    })
  }

  private async resolveMethod(target: string, serviceName: string, methodName: string): Promise<DescMethod> {
    validateMethodNames(serviceName, methodName)

    const registry = await this.schemaRepository.getFileRegistry(target, serviceName)
    const service = registry.getService(serviceName)
    if (!service) throw new AppError(`Service ${serviceName} not found in registry`, 404, 'SERVICE_NOT_FOUND')

    const method = service.methods.find(m => m.name === methodName)
    if (!method) throw new AppError(`Method ${methodName} not found on service ${serviceName}`, 404, 'METHOD_NOT_FOUND')

    return method
  }
}

function validateMethodNames(serviceName: string, methodName: string): void {
  if (!VALID_NAME_RE.test(serviceName)) throw new AppError(`Invalid service name: ${serviceName}`, 400, 'INVALID_SERVICE_NAME')
  if (!VALID_NAME_RE.test(methodName)) throw new AppError(`Invalid method name: ${methodName}`, 400, 'INVALID_METHOD_NAME')
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
    throw new AppError(
      `Method ${method.parent.typeName}/${method.name} is ${method.methodKind}, not ${methodKind}`,
      400,
      'METHOD_KIND_MISMATCH'
    )
  }
}

export default new GrpcMethodInvokerService()
