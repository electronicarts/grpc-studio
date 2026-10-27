// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { WktWrapperDesc } from '@bufbuild/protobuf/wkt'
import ScalarField from '../fields/ScalarField'

interface WrapperFieldProps {
  name: string
  desc: WktWrapperDesc
  value: unknown
  onChange: (value: unknown) => void
}

function wrapperValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
  return (value as Record<string, unknown>).value ?? value
}

const WrapperField: React.FC<WrapperFieldProps> = ({ name, desc, value, onChange }) => (
  <ScalarField
    name={name}
    scalar={desc.fields[0].scalar}
    value={wrapperValue(value)}
    onChange={onChange}
    typeNameOverride={desc.typeName}
  />
)

export default WrapperField
