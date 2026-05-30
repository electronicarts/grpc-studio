// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useEffect } from 'react'
import { FormField } from '../../../../components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

interface AnyFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

const PLACEHOLDER = '{\n  "@type": "type.googleapis.com/...",\n  "field": "value"\n}'

// Proto3 JSON encodes google.protobuf.Any as a JSON object with a mandatory
// "@type" key containing the full type URL, plus the message fields inlined.
// The backend passes a WKT type registry to fromJson so well-known types
// embedded in Any (Timestamp, StringValue, etc.) decode correctly.
const AnyField: React.FC<AnyFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const [text, setText] = useState(() =>
    value != null ? JSON.stringify(value, null, 2) : ''
  )
  const [parseError, setParseError] = useState<string | null>(null)

  // Sync display text when parent resets the value
  useEffect(() => {
    if (value == null) {
      setText('')
      setParseError(null)
    } else {
      const serialized = JSON.stringify(value, null, 2)
      setText(prev => {
        try { return JSON.stringify(JSON.parse(prev), null, 2) === serialized ? prev : serialized }
        catch { return serialized }
      })
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    const raw = e.target.value
    setText(raw)
    if (!raw.trim()) {
      setParseError(null)
      onChange(undefined)
      return
    }
    try {
      onChange(JSON.parse(raw))
      setParseError(null)
    } catch {
      setParseError('Invalid JSON')
    }
  }

  return (
    <FormField label={name}>
      <div className="space-y-1">
        <textarea
          value={text}
          onChange={handleChange}
          disabled={readOnly}
          placeholder={PLACEHOLDER}
          rows={4}
          className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background resize-y disabled:opacity-50"
          data-testid="anyField-textarea"
        />
        {parseError && (
          <p className="text-xs text-destructive">{parseError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Requires a <code>&quot;@type&quot;</code> field with the full type URL
        </p>
      </div>
    </FormField>
  )
}

export default AnyField
