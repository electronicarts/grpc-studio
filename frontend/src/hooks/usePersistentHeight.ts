// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback, useEffect, useRef } from 'react'
import { safeGetJSON, safeSetJSON } from '@/utils/storageHelpers'

/**
 * usePersistentHeight — remembers the height a user drags a natively-resizable
 * element (CSS `resize`) to, keyed in localStorage.
 *
 * Native resize doesn't fire React events, so we watch the element with a
 * ResizeObserver and persist its height (debounced). The latest height is also
 * kept in a ref and applied as the element's inline style, so the size survives
 * remounts (e.g. toggling a tab that unmounts the element) — not just full page
 * reloads. Falls back to `defaultHeight` (any CSS length, e.g. '32rem') when
 * nothing is stored yet.
 *
 * Returns a callback `ref` to attach to the resizable element (a callback ref so
 * the observer re-attaches whenever the element remounts) and the inline `style`
 * to spread onto it so the initial render already reflects the saved height.
 */
export function usePersistentHeight<T extends HTMLElement = HTMLDivElement>(
  key: string,
  defaultHeight: string
): { ref: (node: T | null) => void; style: React.CSSProperties } {
  // Latest known height, read at render time so a remount restores it. Seeded
  // from storage; updated in place as the user drags (no re-render mid-drag).
  const heightRef = useRef<string>(safeGetJSON<string>(key) ?? defaultHeight)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback(
    (node: T | null) => {
      // Detach from any previous element before (re)attaching.
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!node || typeof ResizeObserver === 'undefined') return

      // Ignore the observer's initial fire; only persist heights the user drags to.
      let seenInitial = false
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        if (!seenInitial) {
          seenInitial = true
          return
        }
        const px = `${Math.round(entry.contentRect.height)}px`
        heightRef.current = px
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => safeSetJSON(key, px), 200)
      })
      observer.observe(node)
      observerRef.current = observer
    },
    [key]
  )

  useEffect(
    () => () => {
      observerRef.current?.disconnect()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    []
  )

  return { ref, style: { height: heightRef.current } }
}
