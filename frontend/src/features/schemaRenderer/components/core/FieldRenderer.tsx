// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { defaultFieldValue } from '@/features/schemaRenderer/utils/fieldDefaults'
import { isFramedMessageType } from '@/features/schemaRenderer/utils/wellKnownTypes'
import ScalarField from '@/features/schemaRenderer/components/fields/ScalarField'
import EnumField from '@/features/schemaRenderer/components/fields/EnumField'
import ListField from '@/features/schemaRenderer/components/fields/ListField'
import MapField from '@/features/schemaRenderer/components/fields/MapField'
import MessageField from '@/features/schemaRenderer/components/fields/MessageField'
import PresenceCheckbox from '@/features/schemaRenderer/components/shared/PresenceCheckbox'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'

interface FieldRendererProps {
  field: DescField
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

/** Fields shown as a framed section (messages, Struct, lists, maps) put their checkbox in the frame header. */
function isFramed(field: DescField): boolean {
  return (
    field.fieldKind === 'list' ||
    field.fieldKind === 'map' ||
    (field.fieldKind === 'message' && isFramedMessageType(field.message))
  )
}

/**
 * Pure router that maps buf's fieldKind discriminated union to presentation components.
 * Each case corresponds exactly to one of buf's field kinds: scalar, enum, message, map, list.
 *
 * When editing, every field gets a checkbox deciding whether it is part of the request, i.e. whether its key
 * appears in the request JSON. Oneof members are the exception: the oneof selection decides that for them.
 */
const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, path }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const presence: FieldPresence | undefined =
    readOnly || field.oneof
      ? undefined
      : {
          isSet: value !== undefined && value !== null,
          onToggle: isSet => onChange(isSet ? defaultFieldValue(field) : undefined),
        }

  const renderField = () => {
    switch (field.fieldKind) {
      case 'scalar':
        return <ScalarField name={field.name} scalar={field.scalar} value={value} onChange={onChange} />

      case 'enum':
        return (
          <EnumField
            name={field.name}
            enumDesc={field.enum}
            value={value as string | number | undefined}
            onChange={onChange}
          />
        )

      case 'list':
        return (
          <ListField
            field={field}
            value={value as unknown[]}
            onChange={onChange as (v: unknown[]) => void}
            path={path}
            presence={presence}
          />
        )

      case 'map':
        return (
          <MapField
            field={field}
            value={value as Record<string, unknown>}
            onChange={onChange}
            path={path}
            presence={presence}
          />
        )

      case 'message':
        return <MessageField field={field} value={value} onChange={onChange} path={path} presence={presence} />
    }
  }

  if (!presence || isFramed(field)) return renderField()

  // Single-input fields: editing the value sets them, emptying it unsets them, and the checkbox does either.
  return (
    <div className="flex items-start gap-2">
      <PresenceCheckbox name={field.name} presence={presence} className="mt-0.5" />
      <div className="min-w-0 flex-1">{renderField()}</div>
    </div>
  )
}

export default FieldRenderer
