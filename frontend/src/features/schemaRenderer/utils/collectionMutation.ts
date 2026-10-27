// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function replaceArrayItem<T>(items: readonly T[], index: number, value: T): T[] {
  const next = [...items]
  next[index] = value
  return next
}

export function removeArrayItem<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index)
}

export function setObjectEntry<T>(
  object: Record<string, T>,
  key: string,
  value: T,
): Record<string, T> {
  return { ...object, [key]: value }
}

export function removeObjectEntry<T>(
  object: Record<string, T>,
  key: string,
): Record<string, T> {
  const next = { ...object }
  delete next[key]
  return next
}

/** Renames a key in place, keeping the entry's position among the other entries. */
export function renameObjectEntry<T>(
  object: Record<string, T>,
  from: string,
  to: string,
): Record<string, T> {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key === from ? to : key, value]))
}
