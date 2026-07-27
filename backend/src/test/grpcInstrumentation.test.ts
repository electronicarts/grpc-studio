// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { instrumentUnaryCall, instrumentStreamCall } from '../grpc/instrumentation/grpcInstrumentation.js'
import { metricsRegistry } from '../metrics/registry.js'
import type { StreamCallbacks, StreamHandle, UnaryResult } from '../types/index.js'

// Each test uses a unique service name so its metric label combination is isolated
// from every other test's counters/gauges in the shared registry.
async function counterValue(metric: string, labels: Record<string, string>): Promise<number> {
  const json = await metricsRegistry.getRegistry().getMetricsAsJSON()
  // Histogram-derived series (e.g. `${name}_count`) live on the parent metric's values
  // under a per-value `metricName`, so match against both the metric name and metricName.
  for (const entry of json) {
    const values = entry.values as Array<{ value: number; metricName?: string; labels: Record<string, string> }>
    const match = values.find(
      (v) =>
        (v.metricName ?? entry.name) === metric &&
        Object.entries(labels).every(([k, val]) => v.labels[k] === val)
    )
    if (match) return match.value
  }
  return 0
}

function noopCallbacks(): StreamCallbacks {
  return { onData: () => {}, onEnd: () => {}, onError: () => {} }
}

describe('grpcInstrumentation', () => {
  describe('instrumentUnaryCall', () => {
    it('records a success counter and duration when the call succeeds', async () => {
      const service = 'inst.UnarySuccess'
      const result = await instrumentUnaryCall(service, 'Get', async (): Promise<UnaryResult> => ({
        success: true,
        data: { ok: true },
        completedAtMs: 1,
      }))

      assert.equal(result.success, true)
      assert.equal(
        await counterValue('grpc_studio_grpc_requests_total', {
          service, method: 'Get', rpc_type: 'unary', status: 'success',
        }),
        1
      )
      // Duration histogram records one observation (its _count series).
      assert.equal(
        await counterValue('grpc_studio_grpc_request_duration_seconds_count', {
          service, method: 'Get', rpc_type: 'unary',
        }),
        1
      )
    })

    it('records an error counter when the result is unsuccessful', async () => {
      const service = 'inst.UnaryResultError'
      await instrumentUnaryCall(service, 'Get', async (): Promise<UnaryResult> => ({
        success: false,
        error: 'boom',
        completedAtMs: 1,
      }))

      assert.equal(
        await counterValue('grpc_studio_grpc_requests_total', {
          service, method: 'Get', rpc_type: 'unary', status: 'error',
        }),
        1
      )
    })

    it('records an error counter and rethrows when the call throws', async () => {
      const service = 'inst.UnaryThrow'
      await assert.rejects(
        instrumentUnaryCall(service, 'Get', async () => {
          throw new Error('network down')
        }),
        /network down/
      )

      assert.equal(
        await counterValue('grpc_studio_grpc_requests_total', {
          service, method: 'Get', rpc_type: 'unary', status: 'error',
        }),
        1
      )
    })
  })

  describe('instrumentStreamCall', () => {
    it('increments active streams on start and decrements + counts success on onEnd', async () => {
      const service = 'inst.StreamSuccess'
      const labels = { service, method: 'List', rpc_type: 'server_streaming' }
      let wrapped: StreamCallbacks | null = null

      const handle = await instrumentStreamCall(service, 'List', 'server_streaming', noopCallbacks(), async (cb) => {
        wrapped = cb
        // While the stream is open, the active gauge should read 1.
        assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 1)
        return { cancel: () => {} } satisfies StreamHandle
      })

      // Deliver a message, then end the stream.
      wrapped!.onData({ n: 1 })
      wrapped!.onEnd()

      assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 0, 'active streams returns to 0')
      assert.equal(
        await counterValue('grpc_studio_grpc_stream_messages_total', { service, method: 'List', direction: 'received' }),
        1
      )
      assert.equal(
        await counterValue('grpc_studio_grpc_requests_total', { ...labels, status: 'success' }),
        1
      )
      void handle
    })

    it('decrements active streams and counts an error on onError', async () => {
      const service = 'inst.StreamError'
      const labels = { service, method: 'List', rpc_type: 'server_streaming' }
      let wrapped: StreamCallbacks | null = null

      await instrumentStreamCall(service, 'List', 'server_streaming', noopCallbacks(), async (cb) => {
        wrapped = cb
        return { cancel: () => {} }
      })

      wrapped!.onError({ formatted: 'gRPC UNAVAILABLE: down' })

      assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 0)
      assert.equal(
        await counterValue('grpc_studio_grpc_requests_total', { ...labels, status: 'error' }),
        1
      )
    })

    it('decrements active streams exactly once when the handle is cancelled', async () => {
      const service = 'inst.StreamCancel'
      const labels = { service, method: 'Chat', rpc_type: 'bidi_streaming' }

      const handle = await instrumentStreamCall(service, 'Chat', 'bidi_streaming', noopCallbacks(), async () => ({
        cancel: () => {},
      }))

      assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 1, 'gauge up after start')
      handle.cancel()
      assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 0, 'cancel decrements gauge')
    })

    it('decrements active streams when the stream fails to open', async () => {
      const service = 'inst.StreamOpenFail'
      const labels = { service, method: 'List', rpc_type: 'server_streaming' }

      await assert.rejects(
        instrumentStreamCall(service, 'List', 'server_streaming', noopCallbacks(), async () => {
          throw new Error('cannot open')
        }),
        /cannot open/
      )

      assert.equal(await counterValue('grpc_studio_grpc_active_streams', labels), 0, 'gauge not leaked on open failure')
    })
  })
})
