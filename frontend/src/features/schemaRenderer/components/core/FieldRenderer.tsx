// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import ScalarField from '../fields/ScalarField'
import EnumField from '../fields/EnumField'
import ListField from '../fields/ListField'
import MapField from '../fields/MapField'
import MessageField from '../fields/MessageField'

interface FieldRendererProps {
  field: DescField
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

/**
 * Pure router that maps buf's fieldKind discriminated union to presentation components.
 * Each case corresponds exactly to one of buf's field kinds: scalar, enum, message, map, list.
 */
const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, path }) => {
  switch (field.fieldKind) {
    case 'scalar':
      return <ScalarField name={field.name} scalar={field.scalar} value={value} onChange={onChange} />

    case 'enum':
      return <EnumField name={field.name} enumDesc={field.enum} value={value as string | number | undefined} onChange={onChange} />

    case 'list':
      return <ListField field={field} value={value as unknown[]} onChange={onChange as (v: unknown[]) => void} path={path} />

    case 'map':
      return <MapField field={field} value={value as Record<string, unknown>} onChange={onChange} path={path} />

    case 'message':
      return <MessageField field={field} value={value} onChange={onChange} path={path} />
  }
}

export default FieldRenderer
