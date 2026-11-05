// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'

interface PresenceCheckboxProps {
  name: string
  presence: FieldPresence
  className?: string
}

/** Ticked means the field is sent with the request; unticked means it is left out. */
const PresenceCheckbox: React.FC<PresenceCheckboxProps> = ({ name, presence, className }) => (
  <Checkbox
    aria-label={`Send ${name}`}
    title={presence.isSet ? `Sent — untick to leave ${name} out` : `Not sent — tick to send ${name}`}
    checked={presence.isSet}
    onChange={e => presence.onToggle(e.target.checked)}
    className={className}
  />
)

export default PresenceCheckbox
