// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Barrel re-export — preserves the original public API of utils.ts
 * while the actual implementations live in focused single-responsibility modules.
 */

// Field lookup
export { getFieldValue, setFieldValue, getNestedValue } from './fieldLookup'

// OneOf detection
export { detectOneOfSelections } from './oneOfDetection'

// Value utilities
export { isScalar, getInputType, parseValue, isEmptyValue } from './valueUtils'

// Search utilities
export { valueMatchesSearch, fieldMatchesSearch } from './searchUtils'

// Form mutation
export { updateValueAtPath } from './formMutation'

// Path analysis
export { collectExpandablePaths, hasDataAtPath } from './pathAnalysis'

// Field filtering
export { filterFields } from './fieldFiltering'

// Descriptor traversal
export { isCompositeField, forEachNestedMessageValue } from './descriptorTraversal'

// Collection mutation helpers
export { replaceArrayItem, removeArrayItem, setObjectEntry, removeObjectEntry } from './collectionMutation'
