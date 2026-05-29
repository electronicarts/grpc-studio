// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage, DescOneof } from '@bufbuild/protobuf'
import { isEmpty } from './scalarTypeUtils'
import { valueMatchesSearch } from './searchUtils'
import { getFieldValue as getFieldValueUtil } from './fieldLookup'
import { fieldNestedMessage, fieldTypeName } from '../../../utils/descUtils'

function hasMatchingChildren(
  schema: DescMessage,
  query: string,
  fieldValue?: unknown,
): boolean {
  if (!query) return true

  for (const field of schema.fields) {
    const fv = getFieldValueUtil(fieldValue as Record<string, unknown> | null | undefined, field.name)
    if (fieldMatchesField(field, fv, query)) return true

    if (field.fieldKind === 'message') {
      if (hasMatchingChildren(field.message, query, fv)) return true
    } else if (field.fieldKind === 'list' && field.listKind === 'message') {
      if (hasMatchingChildren(field.message, query, fv)) return true
    } else if (field.fieldKind === 'map' && field.mapKind === 'message') {
      if (hasMatchingChildren(field.message, query, fv)) return true
    }
  }

  return false
}

function fieldMatchesField(field: DescField, fieldValue: unknown, query: string): boolean {
  const lowerQuery = query.toLowerCase()
  if (field.name.toLowerCase().includes(lowerQuery) || fieldTypeName(field).toLowerCase().includes(lowerQuery)) {
    return true
  }
  if (fieldValue !== undefined && valueMatchesSearch(fieldValue, query)) return true
  return false
}

export function filterFields(
  schema: DescMessage,
  value: Record<string, unknown>,
  options: {
    searchQuery: string
    hideEmptyFields: boolean
    isRoot: boolean
  }
): { filteredRegular: DescField[]; filteredOneOf: DescOneof[] } {
  const { searchQuery, hideEmptyFields, isRoot } = options
  const regularFields = schema.fields.filter(f => f.oneof === undefined)

  let filteredRegular = isRoot && searchQuery
    ? regularFields.filter(f => {
        const fv = getFieldValueUtil(value, f.name)
        if (fieldMatchesField(f, fv, searchQuery)) return true
        const nested = fieldNestedMessage(f)
        if (nested && hasMatchingChildren(nested, searchQuery, fv)) return true
        return false
      })
    : regularFields

  if (hideEmptyFields) {
    filteredRegular = filteredRegular.filter(f => !isEmpty(getFieldValueUtil(value, f.name)))
  }

  let filteredOneOf = isRoot && searchQuery
    ? schema.oneofs.filter((oneof) => {
        if (oneof.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
        return oneof.fields.some(f => {
          const fv = getFieldValueUtil(value, f.name)
          if (fieldMatchesField(f as unknown as DescField, fv, searchQuery)) return true
          const nested = fieldNestedMessage(f as unknown as DescField)
          if (nested && hasMatchingChildren(nested, searchQuery, fv)) return true
          return false
        })
      })
    : schema.oneofs

  if (hideEmptyFields) {
    filteredOneOf = filteredOneOf.filter((oneof) =>
      oneof.fields.some(f => !isEmpty(getFieldValueUtil(value, f.name)))
    )
  }

  return { filteredRegular, filteredOneOf }
}
