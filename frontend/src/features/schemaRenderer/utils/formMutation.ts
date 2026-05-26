// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Immutably set a value at a dot-separated path inside a nested object.
 * Supports array indices (field[0]) and map keys ([key]).
 */
export function updateValueAtPath(root: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  const newData = { ...root }
  let current = newData

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    const mapMatch = part.match(/^\[(.+)\]$/)

    if (arrayMatch) {
      const [, arrName, idxStr] = arrayMatch
      const idx = parseInt(idxStr)
      if (!current[arrName]) current[arrName] = []
      const arr = current[arrName] as unknown[]
      if (!arr[idx]) arr[idx] = {}
      current = arr[idx] as { [x: string]: unknown }
    } else if (mapMatch) {
      const key = mapMatch[1]
      if (!current[key]) current[key] = {}
      current = current[key] as { [x: string]: unknown }
    } else {
      if (!current[part]) current[part] = {}
      current = current[part] as { [x: string]: unknown }
    }
  }

  const lastPart = parts[parts.length - 1]
  const lastArrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/)

  if (lastArrayMatch) {
    const [, arrName, idxStr] = lastArrayMatch
    const idx = parseInt(idxStr)
    if (!current[arrName]) current[arrName] = []
    ;(current[arrName] as unknown[])[idx] = value
  } else {
    current[lastPart] = value
  }

  return newData
}
