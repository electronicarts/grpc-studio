// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { viewTabClass } from './viewTabClass'

export type JsonView = 'full' | 'wire'

interface JsonViewSwitchProps {
  view: JsonView
  onChange: (view: JsonView) => void
  /** Name of the non-wire view. Defaults to the response wording. */
  fullLabel?: string
  /** Explains the non-wire view. */
  fullHint?: string
}

const WIRE_HINT = 'What goes over the wire; plain proto3 fields at their default value are dropped'

/** Switches a JSON view between its full form and its wire form. */
const JsonViewSwitch: React.FC<JsonViewSwitchProps> = ({
  view,
  onChange,
  fullLabel = 'Full',
  fullHint = 'Every field, including those at their default value',
}) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center rounded-lg bg-muted p-0.5" role="group" aria-label="JSON view">
      <button type="button" aria-pressed={view === 'full'} onClick={() => onChange('full')} className={viewTabClass(view === 'full')}>
        {fullLabel}
      </button>
      <button type="button" aria-pressed={view === 'wire'} onClick={() => onChange('wire')} className={viewTabClass(view === 'wire')}>
        Wire
      </button>
    </div>
    <span className="text-xs text-muted-foreground">{view === 'full' ? fullHint : WIRE_HINT}</span>
  </div>
)

export default JsonViewSwitch
