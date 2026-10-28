// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ScalarType } from '@bufbuild/protobuf'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { getInputType, parseValue } from '../../utils/scalarTypeUtils'
import { scalarTypeName } from '../../../../utils/descUtils'
import { FormField } from '../../../../components/shared'

interface ScalarFieldProps {
  name: string
  scalar: ScalarType
  value: unknown
  onChange: (value: unknown) => void
  typeNameOverride?: string
  /** Shows only the input, for rows that name the value themselves (e.g. map entries) */
  hideLabel?: boolean
}

const ScalarField: React.FC<ScalarFieldProps> = ({ name, scalar, value, onChange, typeNameOverride, hideLabel }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const inputType = getInputType(scalar)
  const isBytes = scalar === ScalarType.BYTES
  const isBool = scalar === ScalarType.BOOL
  const isUnset = value === undefined || value === null
  const typeName = typeNameOverride || scalarTypeName(scalar)
  // Bytes are already base64 strings in proto JSON
  const displayValue = String(value ?? '')

  const typeMeta = <span className="text-xs text-muted-foreground">({typeName})</span>

  if (isBool && readOnly) {
    return (
      <FormField label={name} labelMeta={typeMeta} inline hideLabel={hideLabel}>
        <Checkbox aria-label={name} checked={!!value} disabled />
      </FormField>
    )
  }

  // When editing, a bool's value is a true/false choice, so it never looks like the checkbox that decides
  // whether the field is sent.
  if (isBool) {
    return (
      <FormField label={name} labelMeta={typeMeta} hideLabel={hideLabel}>
        <Select
          aria-label={name}
          value={isUnset ? '' : String(!!value)}
          onChange={e => onChange(e.target.value === 'true')}
        >
          {isUnset && <option value="">Select {name}</option>}
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      </FormField>
    )
  }

  return (
    <FormField label={name} labelMeta={typeMeta} hideLabel={hideLabel}>
      <Input
        type={inputType}
        aria-label={name}
        value={displayValue}
        onChange={e => onChange(parseValue(e.target.value, scalar))}
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
