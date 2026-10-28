// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import MessageFieldFrame from '@/features/schemaRenderer/components/shared/MessageFieldFrame'
import StructObjectFields from '@/features/schemaRenderer/components/struct/StructObjectFields'
import { isJsonObject } from '@/features/schemaRenderer/utils/structValueUtils'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'

interface StructFieldProps {
  name: string
  typeName: string
  value: unknown
  onChange: (value: Record<string, unknown>) => void
  path: string
  presence?: FieldPresence
}

const StructField: React.FC<StructFieldProps> = ({ name, typeName, value, onChange, path, presence }) => (
  <MessageFieldFrame name={name} typeName={typeName} path={path} presence={presence}>
    <StructObjectFields value={isJsonObject(value) ? value : {}} onChange={onChange} />
  </MessageFieldFrame>
)

export default StructField
