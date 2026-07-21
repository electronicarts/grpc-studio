// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext, useContext, ReactNode, useMemo } from 'react'

export interface ProtoMessageRendererContextValue {
  target: string
  readOnly: boolean
  hideEmptyFields: boolean
  formData: Record<string, unknown>
  schemasLoaded: boolean
  expanded: Set<string>
  oneOfSelections: Map<string, string>
  searchQuery: string
  toggleExpand: (path: string) => void
  setOneOfSelection: (groupPath: string, fieldName: string) => void
}

const ProtoMessageRendererContext = createContext<ProtoMessageRendererContextValue | null>(null)

export function useProtoMessageRendererContext(): ProtoMessageRendererContextValue {
  const context = useContext(ProtoMessageRendererContext)
  if (!context) {
    throw new Error('useProtoMessageRendererContext must be used within ProtoMessageRendererProvider')
  }
  return context
}

interface ProtoMessageRendererProviderProps {
  target: string
  formData: Record<string, unknown>
  schemasLoaded: boolean
  expanded: Set<string>
  oneOfSelections: Map<string, string>
  searchQuery: string
  readOnly: boolean
  hideEmptyFields: boolean
  onToggleExpand: (path: string) => void
  onSetOneOfSelection: (groupPath: string, fieldName: string) => void
  children: ReactNode
}

export function ProtoMessageRendererProvider({
  target,
  formData,
  schemasLoaded,
  expanded,
  oneOfSelections,
  searchQuery,
  readOnly,
  hideEmptyFields,
  onToggleExpand,
  onSetOneOfSelection,
  children
}: ProtoMessageRendererProviderProps) {
  const value = useMemo<ProtoMessageRendererContextValue>(() => ({
    target,
    readOnly,
    hideEmptyFields,
    formData,
    schemasLoaded,
    expanded,
    oneOfSelections,
    searchQuery,
    toggleExpand: onToggleExpand,
    setOneOfSelection: onSetOneOfSelection,
  }), [
    target, readOnly, hideEmptyFields, formData, schemasLoaded,
    expanded, oneOfSelections, searchQuery,
    onToggleExpand, onSetOneOfSelection,
  ])

  return (
    <ProtoMessageRendererContext.Provider value={value}>
      {children}
    </ProtoMessageRendererContext.Provider>
  )
}

