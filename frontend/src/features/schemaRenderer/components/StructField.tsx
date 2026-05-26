// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import MessageFieldFrame from './MessageFieldFrame'
import { StructObjectFields } from './structField/StructObjectFields'
import { isJsonObject } from './structField/structValueUtils'

interface StructFieldProps {
  name: string
  typeName: string
  value: unknown
  onChange: (value: Record<string, unknown>) => void
  path: string
}

const StructField: React.FC<StructFieldProps> = ({ name, typeName, value, onChange, path }) => (
  <MessageFieldFrame name={name} typeName={typeName} path={path}>
    <StructObjectFields value={isJsonObject(value) ? value : {}} onChange={onChange} />
  </MessageFieldFrame>
)

export default StructField
