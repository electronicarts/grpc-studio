// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ScalarType } from '@bufbuild/protobuf'
import { isRecord } from '../../../utils/jsonUtils'

export type StructKind = 'null' | 'number' | 'string' | 'bool' | 'struct' | 'list'

export const STRUCT_KIND_OPTIONS: Array<{ kind: StructKind; fieldName: string; label: string }> = [
  { kind: 'null', fieldName: 'null_value', label: 'null_value (null)' },
  { kind: 'number', fieldName: 'number_value', label: 'number_value (number)' },
  { kind: 'string', fieldName: 'string_value', label: 'string_value (string)' },
  { kind: 'bool', fieldName: 'bool_value', label: 'bool_value (bool)' },
  { kind: 'struct', fieldName: 'struct_value', label: 'struct_value (object)' },
  { kind: 'list', fieldName: 'list_value', label: 'list_value (list)' },
]

export const isJsonObject = isRecord

export function scalarType(value: unknown): ScalarType {
  if (typeof value === 'boolean') return ScalarType.BOOL
  if (typeof value === 'number') return ScalarType.DOUBLE
  return ScalarType.STRING
}

export function structKind(value: unknown): StructKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'list'
  if (isJsonObject(value)) return 'struct'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'bool'
  return 'string'
}

export function structKindFieldName(kind: StructKind): string {
  return STRUCT_KIND_OPTIONS.find((option) => option.kind === kind)?.fieldName ?? 'string_value'
}

export function defaultStructValue(kind: StructKind): unknown {
  switch (kind) {
    case 'null':
      return null
    case 'number':
      return 0
    case 'bool':
      return false
    case 'struct':
      return {}
    case 'list':
      return []
    case 'string':
      return ''
  }
}
