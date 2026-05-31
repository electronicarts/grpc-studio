// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useMemo } from 'react'
import { ScalarType } from '@bufbuild/protobuf'
import { Input } from '@/components/ui/input'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { getInputType, parseValue, getScalarTypeName } from '../../utils/scalarTypeUtils'
import { bytesToBase64 } from '../../../../utils/bytesUtils'
import { FormField } from '../../../../components/shared'

interface ScalarFieldProps {
  name: string
  scalar: ScalarType
  value: unknown
  onChange: (value: unknown) => void
  typeNameOverride?: string
}

const ScalarField: React.FC<ScalarFieldProps> = ({ name, scalar, value, onChange, typeNameOverride }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const inputType = getInputType(scalar)
  const isBytes = scalar === ScalarType.BYTES
  const isBool = scalar === ScalarType.BOOL
  const typeName = typeNameOverride || getScalarTypeName(scalar)
  const displayValue = useMemo(
    () => isBytes ? bytesToBase64(value) : String(value ?? ''),
    [isBytes, value],
  )

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    onChange(e.target.checked)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    onChange(parseValue(e.target.value, scalar))
  }

  const typeMeta = <span className="text-xs text-gray-500">({typeName})</span>

  if (isBool) {
    return (
      <FormField label={name} labelMeta={typeMeta} inline>
        <input
          type="checkbox"
          checked={!!value}
          onChange={handleCheckboxChange}
          disabled={readOnly}
          className="rounded border-gray-300"
        />
      </FormField>
    )
  }

  return (
    <FormField label={name} labelMeta={typeMeta}>
      <Input
        type={inputType}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={readOnly ? '' : isBytes ? 'Base64-encoded bytes' : `Enter ${name}`}
        disabled={readOnly}
        className="w-full"
      />
      {isBytes && (
        <span className="text-xs text-muted-foreground">base64 encoded</span>
      )}
    </FormField>
  )
}

export default ScalarField
