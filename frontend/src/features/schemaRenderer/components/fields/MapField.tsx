// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/badge'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { useKeyedRows, type KeyedRow } from '../../hooks/useKeyedRows'
import { filterMapEntries } from '../../utils/mapUtils'
import { fieldTypeName } from '../../../../utils/descUtils'
import EnumField from './EnumField'
import MessageValue from './MessageValue'
import { defaultElementValue } from '../../utils/fieldDefaults'
import { getInputType, parseValue } from '../../utils/scalarTypeUtils'
import MessageFieldFrame from '../shared/MessageFieldFrame'
import type { FieldPresence } from '../shared/fieldPresence'
import AddButton from '../shared/AddButton'
import RemoveButton from '../shared/RemoveButton'
import KeyInput from '../shared/KeyInput'

interface MapFieldProps {
  field: DescField & { fieldKind: 'map' }
  value: unknown
  onChange: (value: Record<string, unknown>) => void
  path: string
  presence?: FieldPresence
}

const MapField: React.FC<MapFieldProps> = ({ field, value, onChange, path, presence }) => {
  const { readOnly, searchQuery } = useProtoMessageRendererContext()

  const isMapObject = value !== null && typeof value === 'object' && !Array.isArray(value)
  const mapValue = isMapObject ? value as Record<string, unknown> : {}

  const { allEntries, entries, countDisplay } = filterMapEntries({ mapValue, searchQuery })
  const { rows, addRow, keys } = useKeyedRows<unknown>(mapValue, onChange, () => defaultElementValue(field), entries.map(([key]) => key))

  const renderValue = (row: KeyedRow<unknown>) => {
    switch (field.mapKind) {
      case 'scalar':
        return (
          <Input
            type={getInputType(field.scalar)}
            value={String(row.value ?? '')}
            onChange={e => row.setValue(parseValue(e.target.value, field.scalar) ?? '')}
            placeholder="Value"
            aria-label={`${field.name} value`}
            disabled={readOnly}
            className="w-full"
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
        return <MessageValue schema={field.message} name="value" value={row.value} onChange={row.setValue} path={`${path}[${row.key}]`} />
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
      meta={(
        <Badge variant="secondary" className="ml-auto bg-info/10">
          {countDisplay} {countDisplay === '1' ? 'entry' : 'entries'}
        </Badge>
      )}
    >
      {rows.map(row => (
        <div key={row.id} className="flex items-start gap-2 border-l-2 border-l-info pl-3">
          <div className={cn('flex-1', !readOnly && 'space-y-2')}>
            {readOnly ? (
              <div className="mb-1 text-sm font-medium text-info">Key: {row.key}</div>
            ) : (
              <KeyInput
                value={row.key}
                existingKeys={keys}
                onCommit={row.commitKey}
                placeholder="Key"
                aria-label={`${field.name} key`}
                autoFocus={row.isPending}
                className="max-w-56"
              />
            )}
            {renderValue(row)}
          </div>
          <RemoveButton label={row.key ? `entry ${row.key}` : 'new entry'} onClick={row.remove} />
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-sm italic text-muted-foreground">
          {searchQuery && allEntries.length > 0
            ? `No entries matching "${searchQuery}"`
            : 'No entries'}
        </div>
      )}

      <AddButton noun="entry" onClick={addRow} testId="mapField-addEntryButton" />
    </MessageFieldFrame>
  )
}

export default MapField
