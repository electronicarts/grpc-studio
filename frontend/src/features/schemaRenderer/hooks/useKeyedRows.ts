// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useRef, useState } from 'react'
import {
  removeObjectEntry,
  renameObjectEntry,
  setObjectEntry,
} from '@/features/schemaRenderer/utils/collectionMutation'

/** One editable entry of a keyed collection. */
export interface KeyedRow<V> {
  /** Stable React key: it survives the row's key being committed or renamed. */
  id: number
  /** Empty while the row is pending, i.e. added but not given a key yet. */
  key: string
  value: V
  isPending: boolean
  commitKey: (key: string) => void
  setValue: (value: V) => void
  remove: () => void
}

/**
 * Turns a keyed collection (map entries, struct fields, mask paths) into rows that are added and edited in
 * place, the same way list items are.
 *
 * Adding creates one pending row, held locally until its key is committed; only then does it enter `entries`.
 * Rows can't be React-keyed by their own key, since committing or renaming it would remount the row and drop
 * focus, nor by position, since JS objects reorder integer-like keys. Instead each key gets an id that moves
 * with it. Keys that arrive from outside (loaded data) are given an id lazily during render; that write is
 * idempotent, so it stays safe under StrictMode's double render.
 */
export function useKeyedRows<V>(
  entries: Record<string, V>,
  onChange: (entries: Record<string, V>) => void,
  createValue: () => V,
  /** Which committed entries to show, e.g. those matching a search. Defaults to all of them. */
  visibleKeys: readonly string[] = Object.keys(entries),
) {
  const ids = useRef(new Map<string, number>())
  const nextId = useRef(0)
  const [pending, setPending] = useState<{ id: number; value: V } | null>(null)
  const keys = new Set(Object.keys(entries))

  const idOf = (key: string): number => {
    let id = ids.current.get(key)
    if (id === undefined) {
      id = nextId.current++
      ids.current.set(key, id)
    }
    return id
  }

  const committedRows: KeyedRow<V>[] = visibleKeys.map(key => ({
    id: idOf(key),
    key,
    value: entries[key],
    isPending: false,
    commitKey: nextKey => {
      ids.current.set(nextKey, idOf(key))
      ids.current.delete(key)
      onChange(renameObjectEntry(entries, key, nextKey))
    },
    setValue: value => onChange(setObjectEntry(entries, key, value)),
    remove: () => {
      ids.current.delete(key)
      onChange(removeObjectEntry(entries, key))
    },
  }))

  const pendingRow: KeyedRow<V> | null = pending && {
    id: pending.id,
    key: '',
    value: pending.value,
    isPending: true,
    commitKey: key => {
      ids.current.set(key, pending.id)
      setPending(null)
      onChange(setObjectEntry(entries, key, pending.value))
    },
    setValue: value => setPending(current => current && { ...current, value }),
    remove: () => setPending(null),
  }

  return {
    rows: pendingRow ? [...committedRows, pendingRow] : committedRows,
    /** Every committed key; a row's key must not collide with another row's. */
    keys: keys as ReadonlySet<string>,
    /** Adds the pending row, unless one is already waiting for its key. */
    addRow: () => {
      if (!pending) setPending({ id: nextId.current++, value: createValue() })
    },
  }
}
