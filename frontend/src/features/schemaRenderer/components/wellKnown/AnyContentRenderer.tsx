// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Renders the content of an Any field based on the selected type.
 * Handles both WKTs (with specialized components) and regular messages (with SchemaRenderer).
 */

import React from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { renderWellKnownType } from '../shared/WellKnownTypeRenderer'
import SchemaRenderer from '../core/SchemaRenderer'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

interface AnyContentRendererProps {
  schema: DescMessage
  formData: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

/**
 * Renders Any field content with proper handling for WKTs.
 *
 * For WKTs (Duration, Timestamp, wrappers):
 * - Proto3 JSON encodes them as `{ "@type": "...", "value": <wkt-value> }`
 * - We extract the "value" field and render it with the specialized component
 * - onChange wraps the value back into { "value": <wkt-value> }
 *
 * For regular messages:
 * - Render with SchemaRenderer as usual
 */
const AnyContentRenderer: React.FC<AnyContentRendererProps> = ({ schema, formData, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const typeName = schema.typeName

  // For WKTs in Any, proto3 JSON encodes them as { "@type": "...", "value": <wkt-json> }
  // We extract the "value" field, pass it to the WKT component, and wrap it back on change.
  const wktValue = formData['value']
  const handleWktChange = (newValue: unknown) => {
    // Only include 'value' field if it's actually set (not undefined/null/empty string)
    // This prevents sending { "@type": "...", "value": "" } which causes backend
    // fromJson to fail for wrapper fields (e.g., BytesValue expects Uint8Array, not empty string)
    if (newValue === undefined || newValue === null || newValue === '') {
      onChange({})
    } else {
      onChange({ value: newValue })
    }
  }

  // Try rendering as a well-known type
  const wktComponent = renderWellKnownType({
    typeName,
    fieldName: 'value',
    value: wktValue,
    onChange: handleWktChange,
    path: ''
  })

  if (wktComponent) {
    return wktComponent
  }

  // Not a WKT - render as regular message
  return (
    <SchemaRenderer
      schema={schema}
      data={formData}
      onChange={onChange}
      readOnly={readOnly}
      showControls={false}
    />
  )
}

export default AnyContentRenderer
