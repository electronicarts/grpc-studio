// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { removeObjectEntry, setObjectEntry } from '../../utils/collectionMutation'
import { filterMapEntries } from '../../utils/mapUtils'
import { getScalarTypeName, getFieldTypeName } from '../../utils/scalarTypeUtils'
import MessageRenderer from '../core/MessageRenderer'
import MessageFieldFrame from '../shared/MessageFieldFrame'
import { MapEntryAdder } from '../shared/MapEntryAdder'

interface MapFieldProps {
  field: DescField & { fieldKind: 'map' }
  value: unknown
  onChange: (value: Record<string, unknown>) => void
  path: string
}

const MapField: React.FC<MapFieldProps> = ({ field, value, onChange, path }) => {
  const { readOnly, searchQuery } = useProtoMessageRendererContext()

  const isMapObject = value !== null && typeof value === 'object' && !Array.isArray(value)
  const mapValue = isMapObject ? value as Record<string, unknown> : {}
  const isScalarValue = field.mapKind === 'scalar'
  const valueSchema = field.mapKind === 'message' ? field.message : null

  const { allEntries, entries, countDisplay } = filterMapEntries({ mapValue, searchQuery })

  // Determine key and value types for type display (e.g., "map<string, int32>")
  const keyType = getScalarTypeName(field.mapKey)
  const valueType = getFieldTypeName(field.mapKind, field)

  return (
    <MessageFieldFrame
      name={field.name}
      typeName={`map<${keyType}, ${valueType}>`}
      path={path}
      className="border-info/30 bg-info/10"
      bodyClassName="ml-6 space-y-3"
      meta={(
        <Badge variant="secondary" className="ml-auto bg-info/10">
          {countDisplay} {countDisplay === '1' ? 'entry' : 'entries'}
        </Badge>
      )}
    >
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-2 border-l-2 border-l-info pl-3">
          <div className="flex-1">
            <div className="mb-1 text-sm font-medium text-info">
              Key: {key}
            </div>
            {isScalarValue ? (
              <Input
                value={(val as string | number | undefined) ?? ''}
                onChange={e => {
                  if (readOnly) return
                  onChange(setObjectEntry(mapValue, key, e.target.value))
                }}
                disabled={readOnly}
                className="w-full"
              />
            ) : valueSchema ? (
              <div className="rounded bg-muted p-2">
                <MessageRenderer
                  schema={valueSchema}
                  value={(val as Record<string, unknown>) || {}}
                  onChange={newVal => onChange(setObjectEntry(mapValue, key, newVal))}
                  basePath={`${path}[${key}]`}
                />
              </div>
            ) : (
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
              </pre>
            )}
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(removeObjectEntry(mapValue, key))}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}

      {!readOnly && (
        <MapEntryAdder
          isScalarValue={isScalarValue}
          mapValue={mapValue}
          onChange={onChange}
        />
      )}

      {entries.length === 0 && (
        <div className="text-sm italic text-muted-foreground">
          {searchQuery && allEntries.length > 0
            ? `No entries matching "${searchQuery}"`
            : 'No entries'}
        </div>
      )}
    </MessageFieldFrame>
  )
}

export default MapField
