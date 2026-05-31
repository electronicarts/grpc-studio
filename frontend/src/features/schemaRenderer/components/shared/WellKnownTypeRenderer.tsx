// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared logic for rendering well-known types with specialized components.
 * Used by both MessageField (for WKT fields) and AnyContentRenderer (for WKT content in Any).
 */

import React from 'react'
import { isTimestampType, isDurationType, isFieldMaskType, isStructType, isAnyType, wrapperPrimitiveType } from '../../../../utils/descUtils'
import TimestampField from '../wellKnown/TimestampField'
import DurationField from '../wellKnown/DurationField'
import FieldMaskField from '../wellKnown/FieldMaskField'
import WrapperField from '../wellKnown/WrapperField'
import AnyField from '../wellKnown/AnyField'
import StructField from '../struct/StructField'

interface WellKnownTypeRendererProps {
  typeName: string
  fieldName: string
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

/**
 * Routes a message type to its specialized WKT component.
 * Returns the component if it's a WKT, or null if it should be rendered as a regular message.
 */
export function renderWellKnownType(props: WellKnownTypeRendererProps): React.ReactElement | null {
  const { typeName, fieldName, value, onChange, path } = props

  if (isTimestampType(typeName)) {
    return <TimestampField name={fieldName} value={value} onChange={onChange} />
  }

  if (isDurationType(typeName)) {
    return <DurationField name={fieldName} value={value} onChange={onChange} />
  }

  if (isFieldMaskType(typeName)) {
    return <FieldMaskField name={fieldName} value={value} onChange={onChange} />
  }

  if (isAnyType(typeName)) {
    return <AnyField name={fieldName} value={value} onChange={onChange} />
  }

  if (isStructType(typeName)) {
    return (
      <StructField
        name={fieldName}
        typeName={typeName}
        value={value}
        onChange={onChange as (value: Record<string, unknown>) => void}
        path={path}
      />
    )
  }

  const wrapperType = wrapperPrimitiveType(typeName)
  if (wrapperType) {
    return <WrapperField name={fieldName} typeName={typeName} value={value} onChange={onChange} />
  }

  // Not a WKT
  return null
}

/**
 * Checks if a type is a well-known type that should use a specialized renderer.
 */
export function isWellKnownTypeWithRenderer(typeName: string): boolean {
  return (
    isTimestampType(typeName) ||
    isDurationType(typeName) ||
    isFieldMaskType(typeName) ||
    isAnyType(typeName) ||
    isStructType(typeName) ||
    wrapperPrimitiveType(typeName) !== null
  )
}
