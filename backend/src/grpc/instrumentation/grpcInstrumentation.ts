// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { StreamCallbacks, StreamHandle, UnaryResult } from '../../types/index.js'
import { grpcRequestsTotal, grpcRequestDuration, grpcActiveStreams, grpcStreamMessages } from '../../metrics/collectors/grpcMetrics.js'
import logger from '../../utils/logger.js'

const instrumentationLogger = logger.child({ module: 'grpc-instrumentation' })

/**
 * Instruments a unary gRPC call with metrics.
 */
export async function instrumentUnaryCall(
  serviceName: string,
  methodName: string,
  fn: () => Promise<UnaryResult>
): Promise<UnaryResult> {
  const start = process.hrtime.bigint()
  const labels = { service: serviceName, method: methodName, rpc_type: 'unary' }

  try {
    const result = await fn()

    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9
    const status = result.success ? 'success' : 'error'

    try {
      grpcRequestsTotal.inc({ ...labels, status })
      grpcRequestDuration.observe(labels, durationSeconds)
    } catch (metricsError) {
      instrumentationLogger.warn('Failed to record gRPC metrics', {
        error: metricsError instanceof Error ? metricsError.message : 'Unknown',
      })
    }

    return result
  } catch (error) {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

    try {
      grpcRequestsTotal.inc({ ...labels, status: 'error' })
      grpcRequestDuration.observe(labels, durationSeconds)
    } catch (metricsError) {
      instrumentationLogger.warn('Failed to record gRPC error metrics', {
        error: metricsError instanceof Error ? metricsError.message : 'Unknown',
      })
    }

    throw error
  }
}

/**
 * Instruments a streaming gRPC call (server streaming, client streaming, or bidi).
 */
export async function instrumentStreamCall(
  serviceName: string,
  methodName: string,
  rpcType: 'client_streaming' | 'server_streaming' | 'bidi_streaming',
  originalCallbacks: StreamCallbacks,
  fn: (wrappedCallbacks: StreamCallbacks) => Promise<StreamHandle>
): Promise<StreamHandle> {
  const start = process.hrtime.bigint()
  const labels = { service: serviceName, method: methodName, rpc_type: rpcType }

  try {
    grpcActiveStreams.inc(labels)
  } catch (error) {
    instrumentationLogger.warn('Failed to increment active streams', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }

  const wrappedCallbacks: StreamCallbacks = {
    onData: (data) => {
      try {
        grpcStreamMessages.inc({ service: serviceName, method: methodName, direction: 'received' })
      } catch {
        // Graceful degradation
      }
      originalCallbacks.onData(data)
    },

    onEnd: () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9
      try {
        grpcActiveStreams.dec(labels)
        grpcRequestsTotal.inc({ ...labels, status: 'success' })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch {
        // Graceful degradation
      }
      originalCallbacks.onEnd()
    },

    onError: (error) => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9
      try {
        grpcActiveStreams.dec(labels)
        grpcRequestsTotal.inc({ ...labels, status: 'error' })
        grpcRequestDuration.observe(labels, durationSeconds)
      } catch {
        // Graceful degradation
      }
      originalCallbacks.onError(error)
    },
  }

  try {
    const handle = await fn(wrappedCallbacks)

    const originalCancel = handle.cancel
    handle.cancel = () => {
      try {
        grpcActiveStreams.dec(labels)
      } catch {
        // Graceful degradation
      }
      originalCancel()
    }

    return handle
  } catch (error) {
    try {
      grpcActiveStreams.dec(labels)
    } catch {
      // Graceful degradation
    }
    throw error
  }
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
