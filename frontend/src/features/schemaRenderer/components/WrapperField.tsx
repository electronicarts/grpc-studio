// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { wrapperPrimitiveType } from '../../../utils/descUtils'
import ScalarField from './ScalarField'

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
  const primitiveType = wrapperPrimitiveType(typeName) ?? 'string'

  return (
    <ScalarField
      name={name}
      type={primitiveType}
      value={wrapperValue(value)}
      onChange={nextValue => onChange({ value: nextValue })}
    />
  )
}

export default WrapperField
