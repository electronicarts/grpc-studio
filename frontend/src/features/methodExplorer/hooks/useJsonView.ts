// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState } from 'react'
import type { JsonView } from '../types'

const WIRE_UNAVAILABLE = 'The wire form is not available: this JSON is not a valid message for its schema.'

/**
 * State for a JSON view with a Full/Wire switch. The wire form is computed only while the Wire view is shown,
 * so full views and other tabs cost nothing extra.
 *
 * @param canShowWire whether a wire form can exist at all (there is a schema and a message); a cheap check
 * @param toWire computes the wire form: JSON text or a value to serialize; null or a throw means unavailable
 */
export function useJsonView(canShowWire: boolean, toWire: () => unknown) {
  const [selected, setView] = useState<JsonView>('full')
  const view: JsonView = canShowWire ? selected : 'full'
  const wire = view === 'wire' ? formatWire(toWire) : null

  return {
    view,
    setView,
    canShowWire,
    /** The wire form as JSON text, or a message saying it is unavailable; empty in the full view. */
    wireText: wire?.text ?? '',
    wireUnavailable: wire?.unavailable ?? false,
  }
}

function formatWire(toWire: () => unknown): { text: string; unavailable: boolean } {
  try {
    const wire = toWire()
    if (wire === null || wire === undefined) return { text: WIRE_UNAVAILABLE, unavailable: true }
    return { text: typeof wire === 'string' ? wire : JSON.stringify(wire, null, 2), unavailable: false }
  } catch {
    return { text: WIRE_UNAVAILABLE, unavailable: true }
  }
}
