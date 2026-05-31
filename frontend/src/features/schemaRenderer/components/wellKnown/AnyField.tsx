// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useMemo, useSyncExternalStore } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { FormField } from '../../../../components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { schemaCache } from '../../../schemaLoader/lib/schemaCache'
import AnyContentRenderer from './AnyContentRenderer'

interface AnyFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

function parseAnyValue(value: unknown): { typeName: string; formData: Record<string, unknown> } {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return { typeName: '', formData: {} }
  }
  const obj = value as Record<string, unknown>
  const typeUrl = typeof obj['@type'] === 'string' ? obj['@type'] : ''
  const typeName = typeUrl ? typeUrl.substring(typeUrl.lastIndexOf('/') + 1) : ''
  const formData = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== '@type'))
  return { typeName, formData }
}

// Proto3 JSON encodes google.protobuf.Any as a JSON object with a mandatory
// "@type" key (full type URL) plus the message fields inlined.
//
// Instead of a raw textarea, we:
//  1. Show a dropdown of every type the reflection cache knows about.
//  2. Once a type is selected, render a fully-typed nested form via SchemaRenderer.
//  3. Combine the @type URL and the form data before emitting onChange.
//
// The backend passes a WKT registry to fromJson/toJson so well-known types
// embedded in Any decode correctly end-to-end.
const AnyField: React.FC<AnyFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  // Subscribe to cache updates so the type list refreshes after reflection loads.
  const cacheVersion = useSyncExternalStore(
    cb => schemaCache.subscribe(cb),
    () => schemaCache.getCacheSize(),
  )

  const knownTypeNames = useMemo(
    () => Array.from(schemaCache.getSchemaMap().keys()).sort(),
    // cacheVersion triggers recomputation when new schemas are registered
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheVersion],
  )

  const { typeName: currentTypeName, formData } = parseAnyValue(value)
  const currentSchema: DescMessage | null = currentTypeName
    ? schemaCache.getCachedSchema(currentTypeName)
    : null

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return
    const typeName = e.target.value
    if (!typeName) {
      onChange(undefined)
    } else {
      onChange({ '@type': `type.googleapis.com/${typeName}` })
    }
  }

  const handleFormChange = (data: Record<string, unknown>) => {
    onChange({ '@type': `type.googleapis.com/${currentTypeName}`, ...data })
  }

  return (
    <FormField label={name}>
      <div className="space-y-2 border border-input rounded-md p-3 bg-background">
        {/* Type selector */}
        <select
          value={currentTypeName}
          onChange={handleTypeChange}
          disabled={readOnly}
          className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background disabled:opacity-50"
          data-testid="anyField-typeSelect"
        >
          <option value="">Select a type…</option>
          {knownTypeNames.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Nested form for the selected type */}
        {currentTypeName && currentSchema && (
          <div className="border-l-2 border-muted pl-3 pt-1">
            <AnyContentRenderer
              schema={currentSchema}
              formData={formData}
              onChange={handleFormChange}
            />
          </div>
        )}

        {currentTypeName && !currentSchema && (
          <p className="text-xs text-muted-foreground italic">
            Schema for &quot;{currentTypeName}&quot; is not in the reflection cache
          </p>
        )}
      </div>
    </FormField>
  )
}

export default AnyField
