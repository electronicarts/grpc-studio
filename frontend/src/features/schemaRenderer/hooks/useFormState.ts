// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { detectOneOfSelections } from '../utils'
import { useAutoExpand } from './useAutoExpand'

export interface UseFormStateResult {
  formData: Record<string, unknown>
  expanded: Set<string>
  allPaths: Set<string>
  oneOfSelections: Map<string, string>
  searchQuery: string
  
  updateForm: (data: Record<string, unknown>) => void
  toggleExpand: (path: string) => void
  expandAll: () => void
  collapseAll: () => void
  setOneOfSelection: (groupPath: string, fieldName: string) => void
  setSearchQuery: (query: string) => void
}

export function useFormState(
  schema: DescMessage | null,
  data: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  schemasLoaded: boolean,
  defaultCollapsed?: boolean
): UseFormStateResult {
  const [formData, setFormData] = useState<Record<string, unknown>>(data || {})
  const [searchQuery, setSearchQuery] = useState('')
  const [dataVersion, setDataVersion] = useState(0)
  
  // Track oneOf selections: key = "path.groupName", value = selected field name
  const [oneOfSelections, setOneOfSelections] = useState<Map<string, string>>(() => {
    if (schema && data) {
      return detectOneOfSelections(schema, data, '')
    }
    return new Map()
  })

  const { expanded, allPaths, toggleExpand, expandAll, collapseAll } =
    useAutoExpand(schema, formData, schemasLoaded, defaultCollapsed)

  // Sync from parent when data prop changes
  useEffect(() => {
    setFormData(data || {})
    setDataVersion(v => v + 1)
  }, [data])

  useEffect(() => {
    if (!schema || !formData || !schemasLoaded) return
    
    const detected = detectOneOfSelections(schema, formData, '')
    
    setOneOfSelections(prev => {
      const merged = new Map(detected)
      prev.forEach((v, k) => {
        if (!merged.has(k)) {
          merged.set(k, v)
        }
      })
      
      if (merged.size !== prev.size) return merged
      let changed = false
      merged.forEach((v, k) => {
        if (prev.get(k) !== v) changed = true
      })
      return changed ? merged : prev
    })
  }, [schema, formData, schemasLoaded, dataVersion])

  const updateForm = useCallback((newData: Record<string, unknown>) => {
    setFormData(newData)
    onChange(newData)
  }, [onChange])

  const setOneOfSelection = useCallback((groupPath: string, fieldName: string) => {
    setOneOfSelections(prev => {
      const next = new Map(prev)
      next.set(groupPath, fieldName)
      return next
    })
  }, [])

  return {
    formData,
    expanded,
    allPaths,
    oneOfSelections,
    searchQuery,
    updateForm,
    toggleExpand,
    expandAll,
    collapseAll,
    setOneOfSelection,
    setSearchQuery
  }
}
