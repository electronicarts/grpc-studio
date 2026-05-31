// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { wrapperPrimitiveType, scalarTypeFromName } from '../../../../utils/descUtils'
import ScalarField from '../fields/ScalarField'

interface WrapperFieldProps {
  name: string
  typeName: string
  value: unknown
  onChange: (value: unknown) => void
}

function wrapperValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
  return (value as Record<string, unknown>).value ?? value
}

const WrapperField: React.FC<WrapperFieldProps> = ({ name, typeName, value, onChange }) => {
  const primitiveTypeName = wrapperPrimitiveType(typeName) ?? 'string'
  const scalar = scalarTypeFromName(primitiveTypeName)

  return (
    <ScalarField
      name={name}
      scalar={scalar}
      value={wrapperValue(value)}
      onChange={onChange}
      typeNameOverride={typeName}
    />
  )
}

export default WrapperField
