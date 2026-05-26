// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { StreamCallbacks, StreamHandle, UnaryResult } from '../../types/index.js'
import { grpcRequestsTotal, grpcRequestDuration, grpcActiveStreams, grpcStreamMessages } from '../metrics/collectors/grpcMetrics.js'
import { trace, context, SpanStatusCode } from '@opentelemetry/api'
import logger from '../../utils/logger.js'

const instrumentationLogger = logger.child({ module: 'grpc-instrumentation' })

/**
 * Instruments a unary gRPC call with metrics and distributed tracing.
 */
export function instrumentUnaryCall(
  serviceName: string,
  methodName: string,
  fn: () => Promise<UnaryResult>
): Promise<UnaryResult> {
  const start = process.hrtime.bigint()
  const labels = { service: serviceName, method: methodName, rpc_type: 'unary' }

  // Create OpenTelemetry span
  const tracer = trace.getTracer('grpc-studio')
  const span = tracer.startSpan(`gRPC ${serviceName}/${methodName}`, {
    kind: 2,  // CLIENT
    attributes: {
      'rpc.system': 'grpc',
      'rpc.service': serviceName,
      'rpc.method': methodName,
      'rpc.grpc.request.type': 'unary',
    },
  })

  // Execute within span context
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn()

      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

      // Determine success/failure from Result type
      const status = result.success ? 'success' : 'error'

      // Record metrics
      try {
        grpcRequestsTotal.inc({ ...labels, status })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch (metricsError) {
        // Graceful degradation
        instrumentationLogger.warn('Failed to record gRPC metrics', {
          error: metricsError instanceof Error ? metricsError.message : 'Unknown',
        })
      }

      // Update span
      span.setStatus({ code: result.success ? SpanStatusCode.OK : SpanStatusCode.ERROR })
      if (!result.success && result.error) {
        span.setAttribute('rpc.grpc.status_code', 'UNKNOWN')
        span.setAttribute('error.message', result.error)
      }
      span.end()

      return result
    } catch (error) {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

      // Record error metrics
      try {
        grpcRequestsTotal.inc({ ...labels, status: 'error' })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch (metricsError) {
        instrumentationLogger.warn('Failed to record gRPC error metrics', {
          error: metricsError instanceof Error ? metricsError.message : 'Unknown',
        })
      }

      // Update span with error
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.recordException(error as Error)
      span.end()

      // Re-throw to maintain error semantics
      throw error
    }
  })
}

/**
 * Instruments a streaming gRPC call (server streaming, client streaming, or bidi).
 */
export function instrumentStreamCall(
  serviceName: string,
  methodName: string,
  rpcType: 'client_streaming' | 'server_streaming' | 'bidi_streaming',
  originalCallbacks: StreamCallbacks,
  fn: (wrappedCallbacks: StreamCallbacks) => Promise<StreamHandle>
): Promise<StreamHandle> {
  const start = process.hrtime.bigint()
  const labels = { service: serviceName, method: methodName, rpc_type: rpcType }

  // Increment active streams
  try {
    grpcActiveStreams.inc(labels)
  } catch (error) {
    instrumentationLogger.warn('Failed to increment active streams', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }

  // Create span
  const tracer = trace.getTracer('grpc-studio')
  const span = tracer.startSpan(`gRPC Stream ${serviceName}/${methodName}`, {
    kind: 2,  // CLIENT
    attributes: {
      'rpc.system': 'grpc',
      'rpc.service': serviceName,
      'rpc.method': methodName,
      'rpc.grpc.request.type': rpcType,
    },
  })

  // Wrap callbacks to inject instrumentation
  const wrappedCallbacks: StreamCallbacks = {
    onData: (data) => {
      try {
        grpcStreamMessages.inc({ service: serviceName, method: methodName, direction: 'received' })
        span.addEvent('message_received', {
          'message.size': JSON.stringify(data).length,
        })
      } catch {
        // Graceful degradation
      }

      // Call original callback
      originalCallbacks.onData(data)
    },

    onEnd: () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

      // Decrement active streams
      try {
        grpcActiveStreams.dec(labels)
        grpcRequestsTotal.inc({ ...labels, status: 'success' })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch {
        // Graceful degradation
      }

      // Close span
      span.setStatus({ code: SpanStatusCode.OK })
      span.end()

      // Call original callback
      originalCallbacks.onEnd()
    },

    onError: (error) => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

      // Decrement active streams
      try {
        grpcActiveStreams.dec(labels)
        grpcRequestsTotal.inc({ ...labels, status: 'error' })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch {
        // Graceful degradation
      }

      // Update span
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.formatted || error.message || 'Stream error',
      })
      if (error instanceof Error) {
        span.recordException(error)
      }
      span.end()

      // Call original callback
      originalCallbacks.onError(error)
    },
  }

  // Execute stream startup within span context
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const handle = await fn(wrappedCallbacks)

      // Wrap cancel method to track cancellations
      const originalCancel = handle.cancel
      handle.cancel = () => {
        try {
          span.addEvent('stream_cancelled')
          grpcActiveStreams.dec(labels)
        } catch {
          // Graceful degradation
        }
        originalCancel()
      }

      return handle
    } catch (error) {
      // Stream failed to start
      try {
        grpcActiveStreams.dec(labels)
      } catch {
        // Graceful degradation
      }

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Failed to start stream',
      })
      span.recordException(error as Error)
      span.end()

      throw error
    }
  })
}

/**
 * Records a message sent in a streaming RPC.
 */
export function recordStreamMessageSent(serviceName: string, methodName: string): void {
  try {
    grpcStreamMessages.inc({ service: serviceName, method: methodName, direction: 'sent' })
  } catch {
    // Graceful degradation
  }
}
