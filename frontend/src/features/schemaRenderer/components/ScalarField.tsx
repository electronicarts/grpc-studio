// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { useProtoMessageRendererContext } from '../stores/schemaRendererContext'
import { getInputType, parseValue } from '../utils/valueUtils'
import { FormField } from '../../../components/shared'

interface ScalarFieldProps {
  name: string
  type: string
  value: unknown
  onChange: (value: unknown) => void
}

/**
 * Convert a Node.js Buffer JSON shape `{ type: "Buffer", data: [...] }`
 * to a base64 string. Returns the original value if it's already a string
 * or doesn't match the Buffer shape.
 */
function bytesToBase64(value: unknown): string {
  if (typeof value === 'string') return value
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'data' in value &&
    value.type === 'Buffer' &&
    Array.isArray(value.data)
  ) {
    const bytes = new Uint8Array(value.data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
  return String(value ?? '')
}

const ScalarField: React.FC<ScalarFieldProps> = ({ name, type, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const inputType = getInputType(type)
  const isBytes = type === 'bytes'
  const displayValue = useMemo(
    () => isBytes ? bytesToBase64(value) : String(value ?? ''),
    [isBytes, value],
  )

  if (type === 'bool') {
    return (
      <FormField label={name} inline>
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => !readOnly && onChange(e.target.checked)}
          disabled={readOnly}
          className="rounded border-gray-300"
        />
      </FormField>
    )
  }

  return (
    <FormField label={name}>
      <Input
        type={inputType}
        value={displayValue}
        onChange={e => {
          if (readOnly) return
          const parsed = parseValue(e.target.value, type)
          onChange(parsed)
        }}
        placeholder={readOnly ? '' : isBytes ? 'Base64-encoded bytes' : `Enter ${name}`}
        disabled={readOnly}
        className="w-full"
      />
      {isBytes && (
        <span className="text-xs text-muted-foreground mt-0.5">bytes — base64 encoded</span>
      )}
    </FormField>
  )
}

export default ScalarField
