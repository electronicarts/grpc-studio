// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import ScalarField from './ScalarField'
import EnumField from './EnumField'
import RepeatedField from './RepeatedField'
import MapField from './MapField'
import NestedMessageField from './NestedMessageField'

interface FieldRendererProps {
  field: DescField
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, path }) => {
  if (field.fieldKind === 'map') {
    return <MapField field={field} value={value as Record<string, unknown>} onChange={onChange} path={path} />
  }

  if (field.fieldKind === 'list') {
    return <RepeatedField field={field} value={value as unknown[]} onChange={onChange as (v: unknown[]) => void} path={path} />
  }

  if (field.fieldKind === 'enum') {
    return <EnumField name={field.name} enumDesc={field.enum} value={value as string | number | undefined} onChange={onChange} />
  }

  if (field.fieldKind === 'scalar') {
    return <ScalarField name={field.name} scalar={field.scalar} value={value} onChange={onChange} />
  }

  // message (including well-known types handled inside NestedMessageField)
  return <NestedMessageField field={field} value={value} onChange={onChange} path={path} />
}

export default FieldRenderer
