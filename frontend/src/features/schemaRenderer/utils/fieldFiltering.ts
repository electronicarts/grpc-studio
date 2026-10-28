// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage, DescOneof } from '@bufbuild/protobuf'
import { isEmpty } from './scalarTypeUtils'
import { valueMatchesSearch } from './searchUtils'
import { getFieldValue as getFieldValueUtil } from './fieldOperations'
import { canDescendInto } from './descriptorTraversal'
import { fieldTypeName } from '../../../utils/descUtils'

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

  const nested = field.message
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

/**
 * The message's fields and oneof groups to show, in .proto source order (buf's `members`), narrowed by the
 * search query (top level only) and, in response views, to those with data.
 */
export function filterMembers(
  schema: DescMessage,
  value: Record<string, unknown>,
  options: {
    searchQuery: string
    hideEmptyFields: boolean
    isRoot: boolean
  }
): (DescField | DescOneof)[] {
  const { hideEmptyFields } = options
  const query = options.isRoot ? options.searchQuery : ''

  const hasData = (f: DescField) => !isEmpty(getFieldValueUtil(value, f.name))
  const matches = (f: DescField) => fieldOrChildrenMatch(f, getFieldValueUtil(value, f.name), query)

  return schema.members.filter(member => {
    if (member.kind === 'oneof') {
      if (query && !member.name.toLowerCase().includes(query.toLowerCase()) && !member.fields.some(matches)) return false
      return !hideEmptyFields || member.fields.some(hasData)
    }
    if (query && !matches(member)) return false
    return !hideEmptyFields || hasData(member)
  })
}
