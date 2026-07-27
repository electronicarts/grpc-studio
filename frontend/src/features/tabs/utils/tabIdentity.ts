// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod, GrpcService } from '@/types/grpc'
import type { MethodTab } from '../types'

/**
 * A tab's identity is (target, service, method) — the same method on two
 * different target servers is a distinct tab. Duplicates of the same method
 * carry a `#n` suffix on top of this canonical id.
 */
export interface TabSelection {
  target: string
  service: GrpcService
  method: GrpcMethod
}

/** Build the canonical tab id for a target/service/method. */
export function makeTabId(target: string, service: GrpcService, method: GrpcMethod): string {
  return `${target}::${service.fullName}::${method.name}`
}

/** Whether a tab points at the given selection (ignoring any `#n` duplicate suffix). */
export function matchesSelection(tab: MethodTab, selection: TabSelection): boolean {
  return (
    tab.target === selection.target &&
    tab.service.fullName === selection.service.fullName &&
    tab.method.name === selection.method.name
  )
}

/**
 * Next free duplicate id for a source tab, e.g. `base#1`, `base#2`, …
 * `base` is the source tab's canonical id.
 */
export function nextDuplicateId(source: MethodTab, existing: MethodTab[]): string {
  const base = makeTabId(source.target, source.service, source.method)
  const taken = new Set(existing.map(t => t.id))
  let suffix = 1
  while (taken.has(`${base}#${suffix}`)) suffix++
  return `${base}#${suffix}`
}
