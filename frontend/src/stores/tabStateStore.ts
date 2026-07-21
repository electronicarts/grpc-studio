// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * TabStateStore — in-memory, per-tab snapshot of a MethodExplorer's UI state,
 * keyed by the deterministic tab id (see `features/tabs/utils/tabIdentity`).
 *
 * This lives at the app level (not inside a feature) because it is shared
 * session state that both the `tabs` feature (lifecycle: create/close) and the
 * `methodExplorer` feature (producer/consumer of the snapshot) depend on.
 * Keeping it neutral avoids a `tabs` ↔ `methodExplorer` import cycle.
 *
 * Why in-memory (not localStorage): the snapshot holds live object references
 * (protobuf `DescMessage` schemas, parsed responses) that aren't serializable,
 * and it only needs to outlive an unmount within a session — not a reload.
 *
 * Two responsibilities:
 *  1. `snapshots` — the serializable-ish slice so an idle tab can unmount and
 *     rehydrate on return.
 *  2. `liveWork` — the set of tab ids with an in-flight invocation or an active
 *     stream. Playground subscribes to this to decide which tabs must stay
 *     mounted (active tab + any tab doing live work).
 *
 * Slices are deleted on tab close so a reopened (deterministic) id never
 * resurrects stale data.
 */
import type { DescMessage } from '@bufbuild/protobuf'

export interface TabRequestSnapshot {
  body: string
  formData: Record<string, unknown>
  formKey: number
  isFormMode: boolean
  schema: DescMessage | null
  validationError: string | null
}

export interface TabResponseSnapshot {
  raw: string
  data: unknown
  time: number | null
  size: number | null
  schema: DescMessage | null
  isFormMode: boolean
  singleExpanded: boolean
}

export interface TabStreamSnapshot {
  messages: unknown[]
  sentMessages: Record<string, unknown>[]
  completed: boolean
}

export interface TabStateSnapshot {
  request: TabRequestSnapshot
  response: TabResponseSnapshot
  stream: TabStreamSnapshot
  historyVisible: boolean
}

type Listener = () => void

class TabStateStore {
  private snapshots = new Map<string, TabStateSnapshot>()
  private liveWork = new Set<string>()
  private listeners = new Set<Listener>()

  // ── subscriptions (liveWork changes only) ─────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  // ── snapshots ─────────────────────────────────────────────────

  getSnapshot(tabId: string): TabStateSnapshot | undefined {
    return this.snapshots.get(tabId)
  }

  setSnapshot(tabId: string, snapshot: TabStateSnapshot): void {
    // Storing a snapshot is not a mount-affecting change, so no notify().
    this.snapshots.set(tabId, snapshot)
  }

  // ── live work (mount-affecting) ───────────────────────────────

  setLiveWork(tabId: string, isLive: boolean): void {
    const had = this.liveWork.has(tabId)
    if (isLive === had) return
    if (isLive) this.liveWork.add(tabId)
    else this.liveWork.delete(tabId)
    this.notify()
  }

  hasLiveWork(tabId: string): boolean {
    return this.liveWork.has(tabId)
  }

  getLiveWorkKey(): string {
    // Stable string identity for useSyncExternalStore: same members → same
    // string → no spurious re-render.
    return Array.from(this.liveWork).sort().join('|')
  }

  // ── cleanup ───────────────────────────────────────────────────

  remove(tabId: string): void {
    this.snapshots.delete(tabId)
    this.setLiveWork(tabId, false) // notifies if it was live
  }

  clearAll(): void {
    this.snapshots.clear()
    const hadLive = this.liveWork.size > 0
    this.liveWork.clear()
    if (hadLive) this.notify()
  }
}

export const tabStateStore = new TabStateStore()
