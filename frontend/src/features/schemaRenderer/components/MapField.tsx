// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../stores/schemaRendererContext'
import { removeObjectEntry, setObjectEntry } from '../utils/collectionMutation'
import MessageRenderer from './MessageRenderer'
import MessageFieldFrame from './MessageFieldFrame'
import { MapEntryAdder } from './mapField/MapEntryAdder'
import { useMapEntries } from './mapField/useMapEntries'

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

  const { allEntries, entries, countDisplay } = useMapEntries({ mapValue, searchQuery })

  return (
    <MessageFieldFrame
      name={field.name}
      path={path}
      className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
      bodyClassName="ml-6 space-y-3"
      meta={(
        <Badge variant="secondary" className="ml-auto bg-blue-100 dark:bg-blue-800">
          Map ({countDisplay})
        </Badge>
      )}
    >
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 items-start border-l-2 border-blue-300 pl-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
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
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                <MessageRenderer
                  schema={valueSchema}
                  value={(val as Record<string, unknown>) || {}}
                  onChange={newVal => onChange(setObjectEntry(mapValue, key, newVal))}
                  basePath={`${path}[${key}]`}
                />
              </div>
            ) : (
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
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
              <X className="w-4 h-4" />
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
        <div className="text-sm text-gray-500 italic">
          {searchQuery && allEntries.length > 0
            ? `No entries matching "${searchQuery}"`
            : 'No entries'}
        </div>
      )}
    </MessageFieldFrame>
  )
}

export default MapField
