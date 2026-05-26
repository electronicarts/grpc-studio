// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function getValuePreview(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value.substring(0, 50)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.length <= 2) {
      return `[${value.map(v => getValuePreview(v)).join(', ')}]`
    }
    return `[${value.length} items]`
  }
  if (typeof value === 'object') {
    const objKeys = Object.keys(value as Record<string, unknown>)
    if (objKeys.length === 0) return '{}'
    if (objKeys.length === 1) {
      const singleKey = objKeys[0]
      const singleValue = (value as Record<string, unknown>)[singleKey]
      if (typeof singleValue !== 'object') {
        return `{${singleKey}: ${getValuePreview(singleValue)}}`
      }
    }
    const preview = objKeys.slice(0, 2).map(k => {
      const v = (value as Record<string, unknown>)[k]
      if (typeof v === 'object') return k
      return `${k}: ${getValuePreview(v)}`
    }).join(', ')
    return objKeys.length > 2 ? `{${preview}, ...}` : `{${preview}}`
  }
  return String(value)
}

export function getMessagePreview(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return String(msg)
  const keys = Object.keys(msg as Record<string, unknown>)
  if (keys.length === 0) return '{}'

  const preview = keys.slice(0, 3).map(key => {
    return `${key}: ${getValuePreview((msg as Record<string, unknown>)[key])}`
  }).join(', ')

  return keys.length > 3 ? `${preview}, ...` : preview
}
