// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { useKeyedRows, type KeyedRow } from '@/features/schemaRenderer/hooks/useKeyedRows'
import { filterMapEntries } from '@/features/schemaRenderer/utils/mapUtils'
import { fieldTypeName } from '@/utils/descUtils'
import EnumField from '@/features/schemaRenderer/components/fields/EnumField'
import ScalarField from '@/features/schemaRenderer/components/fields/ScalarField'
import MessageValue from '@/features/schemaRenderer/components/fields/MessageValue'
import { defaultElementValue } from '@/features/schemaRenderer/utils/fieldDefaults'
import MessageFieldFrame from '@/features/schemaRenderer/components/shared/MessageFieldFrame'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'
import AddButton from '@/features/schemaRenderer/components/shared/AddButton'
import RemoveButton from '@/features/schemaRenderer/components/shared/RemoveButton'
import KeyInput from '@/features/schemaRenderer/components/shared/KeyInput'

interface MapFieldProps {
  field: DescField & { fieldKind: 'map' }
  value: unknown
  onChange: (value: Record<string, unknown>) => void
  path: string
  presence?: FieldPresence
}

const MapField: React.FC<MapFieldProps> = ({ field, value, onChange, path, presence }) => {
  const { searchQuery } = useProtoMessageRendererContext()

  const isMapObject = value !== null && typeof value === 'object' && !Array.isArray(value)
  const mapValue = isMapObject ? (value as Record<string, unknown>) : {}

  const { allEntries, entries, countDisplay } = filterMapEntries({ mapValue, searchQuery })
  const { rows, addRow, keys } = useKeyedRows<unknown>(
    mapValue,
    onChange,
    () => defaultElementValue(field),
    entries.map(([key]) => key),
  )

  const renderValue = (row: KeyedRow<unknown>) => {
    switch (field.mapKind) {
      case 'scalar':
        return (
          <ScalarField
            name={`${field.name} value`}
            scalar={field.scalar}
            value={row.value}
            onChange={value => row.setValue(value ?? defaultElementValue(field))}
            hideLabel
          />
        )
      case 'enum':
        return (
          <EnumField
            name="value"
            enumDesc={field.enum}
            value={row.value as string | number | undefined}
            onChange={value => row.setValue(value ?? defaultElementValue(field))}
          />
        )
      case 'message':
        return (
          <MessageValue
            schema={field.message}
            name="value"
            value={row.value}
            onChange={row.setValue}
            path={`${path}[${row.key}]`}
          />
        )
    }
  }

  return (
    <MessageFieldFrame
      name={field.name}
      typeName={fieldTypeName(field)}
      path={path}
      presence={presence}
      className="border-info/30 bg-info/10"
      bodyClassName="ml-6 space-y-3"
      meta={
        <Badge variant="secondary" className="ml-auto bg-info/10">
          {countDisplay} {countDisplay === '1' ? 'entry' : 'entries'}
        </Badge>
      }
    >
      {rows.map(row => (
        <div key={row.id} className="flex items-start gap-2 border-l-2 border-l-info pl-3">
          <div className="flex-1 space-y-1">
            <KeyInput
              value={row.key}
              existingKeys={keys}
              onCommit={row.commitKey}
              placeholder="Key"
              aria-label={`${field.name} key`}
              autoFocus={row.isPending}
              className="max-w-56"
              renderReadOnly={key => <div className="text-sm font-medium text-info">Key: {key}</div>}
            />
            {renderValue(row)}
          </div>
          <RemoveButton label={row.key ? `entry ${row.key}` : 'new entry'} onClick={row.remove} />
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-sm italic text-muted-foreground">
          {searchQuery && allEntries.length > 0 ? `No entries matching "${searchQuery}"` : 'No entries'}
        </div>
      )}

      <AddButton noun="entry" onClick={addRow} testId="mapField-addEntryButton" />
    </MessageFieldFrame>
  )
}

export default MapField
