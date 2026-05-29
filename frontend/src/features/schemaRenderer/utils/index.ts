// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Barrel re-export — preserves the original public API of utils.ts
 * while the actual implementations live in focused single-responsibility modules.
 */

// Field operations (get/set)
export { getFieldValue, setFieldValue, getNestedValue } from './fieldOperations'

// OneOf detection
export { detectOneOfSelections } from './oneOfDetection'

// Scalar type utilities
export { getInputType, parseValue, isEmpty } from './scalarTypeUtils'

// Search utilities
export { valueMatchesSearch, fieldMatchesSearch } from './searchUtils'

// Path analysis
export { collectExpandablePaths, hasDataAtPath } from './pathAnalysis'

// Field filtering
export { filterFields } from './fieldFiltering'

// Descriptor traversal
export { isCompositeField, forEachNestedMessageValue } from './descriptorTraversal'

// Collection mutation helpers
export { replaceArrayItem, removeArrayItem, setObjectEntry, removeObjectEntry } from './collectionMutation'
