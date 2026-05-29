// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import cloneDeep from 'lodash-es/cloneDeep'
import set from 'lodash-es/set'
import unset from 'lodash-es/unset'

/**
 * Immutably update a value at a dot-separated path inside a nested object.
 * Supports array indices (field[0]) and map keys ([key]).
 *
 * If value is undefined, the key is deleted instead of being set.
 */
export function updateValueAtPath(
  root: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const result = cloneDeep(root)

  if (value === undefined) {
    unset(result, path)
  } else {
    set(result, path, value)
  }

  return result
}
