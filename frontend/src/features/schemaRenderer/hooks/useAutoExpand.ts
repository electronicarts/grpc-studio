// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { collectExpandablePaths, hasDataAtPath } from '../utils/pathAnalysis'

export interface UseAutoExpandResult {
  expanded: Set<string>
  allPaths: Set<string>
  toggleExpand: (path: string) => void
  expandAll: () => void
  collapseAll: () => void
}

export function useAutoExpand(
  schema: DescMessage | null,
  formData: Record<string, unknown>,
  schemasLoaded: boolean,
  defaultCollapsed?: boolean
): UseAutoExpandResult {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [allPaths, setAllPaths] = useState<Set<string>>(new Set())
  const [autoExpandApplied, setAutoExpandApplied] = useState(false)

  useEffect(() => {
    if (!schema || !schemasLoaded) return
    const paths = collectExpandablePaths(schema)
    setAllPaths(paths)
  }, [schema, schemasLoaded])

  // Auto-expand sections that have data (runs once on first discovery)
  useEffect(() => {
    if (defaultCollapsed || autoExpandApplied || allPaths.size === 0) return

    const pathsWithData = new Set<string>()
    allPaths.forEach(p => {
      if (hasDataAtPath(formData, p)) {
        pathsWithData.add(p)
      }
    })

    if (pathsWithData.size > 0) {
      setExpanded(pathsWithData)
    }
    setAutoExpandApplied(true)
  }, [allPaths, defaultCollapsed, autoExpandApplied, formData])

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(allPaths))
  const collapseAll = () => setExpanded(new Set())

  return { expanded, allPaths, toggleExpand, expandAll, collapseAll }
}
