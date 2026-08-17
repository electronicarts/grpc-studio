// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage, DescOneof } from '@bufbuild/protobuf'
import { isEmpty } from './scalarTypeUtils'
import { valueMatchesSearch } from './searchUtils'
import { getFieldValue as getFieldValueUtil } from './fieldOperations'
import { canDescendInto } from './descriptorTraversal'
import { fieldNestedMessage, fieldTypeName } from '../../../utils/descUtils'

/**
 * Does anything inside `schema` match `query`?
 *
 * The schema graph may be cyclic (a message containing itself), so descent is
 * gated by `canDescendInto` — see that function for the rule.
 */
function hasMatchingChildren(
  schema: DescMessage,
  query: string,
  fieldValue: unknown,
  parentTypes: readonly string[],
): boolean {
  if (!query) return true

  const ancestorTypes = [...parentTypes, schema.typeName]
  const messageValue = fieldValue as Record<string, unknown> | null | undefined

  return schema.fields.some(field =>
    fieldOrChildrenMatch(field, getFieldValueUtil(messageValue, field.name), query, ancestorTypes),
  )
}

/** Does `field` itself match `query`, or anything reachable beneath it? */
function fieldOrChildrenMatch(
  field: DescField,
  fieldValue: unknown,
  query: string,
  ancestorTypes: readonly string[] = [],
): boolean {
  if (fieldMatchesField(field, fieldValue, query)) return true

  const nested = fieldNestedMessage(field)
  if (!nested || !canDescendInto(nested, fieldValue != null, ancestorTypes)) return false
  return hasMatchingChildren(nested, query, fieldValue, ancestorTypes)
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

  const matches = (f: DescField) =>
    fieldOrChildrenMatch(f, getFieldValueUtil(value, f.name), searchQuery)

  let filteredRegular = isRoot && searchQuery
    ? regularFields.filter(matches)
    : regularFields

  if (hideEmptyFields) {
    filteredRegular = filteredRegular.filter(f => !isEmpty(getFieldValueUtil(value, f.name)))
  }

  let filteredOneOf = isRoot && searchQuery
    ? schema.oneofs.filter((oneof) => {
        if (oneof.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
        return oneof.fields.some(f => matches(f as unknown as DescField))
      })
    : schema.oneofs

  if (hideEmptyFields) {
    filteredOneOf = filteredOneOf.filter((oneof) =>
      oneof.fields.some(f => !isEmpty(getFieldValueUtil(value, f.name)))
    )
  }

  return { filteredRegular, filteredOneOf }
}
