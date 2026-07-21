// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Regression tests for the wsConnectionsTotal label set.
 *
 * websocketServer.ts increments this counter with a `reason` label on the
 * defense-in-depth rejection paths (origin_late_check, at_capacity) and on accept.
 * The counter was originally declared with only `['status']`, so the late
 * origin-check path threw "reason is not included in the metric's initial labelset"
 * under prom-client v15 — crashing a security-critical branch instead of closing the
 * socket cleanly. These tests pin the label set so that regression can't return.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { wsConnectionsTotal } from '../metrics/collectors/websocketMetrics.js'
import { metricsRegistry } from '../metrics/registry.js'

async function value(labels: Record<string, string>): Promise<number> {
  const json = await metricsRegistry.getRegistry().getMetricsAsJSON()
  const entry = json.find((m) => m.name === 'grpc_studio_ws_connections_total')
  if (!entry) return 0
  const match = (entry.values as Array<{ value: number; labels: Record<string, string> }>).find((v) =>
    Object.entries(labels).every(([k, val]) => v.labels[k] === val)
  )
  return match?.value ?? 0
}

describe('wsConnectionsTotal label set', () => {
  it('accepts the { status, reason } label combinations used by the server', () => {
    // None of these should throw. Before the fix, the reason-bearing calls threw.
    assert.doesNotThrow(() => {
      wsConnectionsTotal.inc({ status: 'accepted', reason: 'ok' })
      wsConnectionsTotal.inc({ status: 'rejected', reason: 'at_capacity' })
      wsConnectionsTotal.inc({ status: 'rejected', reason: 'origin_late_check' })
    })
  })

  it('records the late origin-check rejection with its distinct reason label', async () => {
    const before = await value({ status: 'rejected', reason: 'origin_late_check' })
    wsConnectionsTotal.inc({ status: 'rejected', reason: 'origin_late_check' })
    const after = await value({ status: 'rejected', reason: 'origin_late_check' })

    assert.equal(after, before + 1)
  })

  it('keeps the at_capacity and origin_late_check reasons as separate series', async () => {
    const capacityBefore = await value({ status: 'rejected', reason: 'at_capacity' })
    const lateBefore = await value({ status: 'rejected', reason: 'origin_late_check' })

    wsConnectionsTotal.inc({ status: 'rejected', reason: 'at_capacity' })

    assert.equal(await value({ status: 'rejected', reason: 'at_capacity' }), capacityBefore + 1)
    // Incrementing one reason must not bleed into the other.
    assert.equal(await value({ status: 'rejected', reason: 'origin_late_check' }), lateBefore)
  })
})
