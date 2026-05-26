// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react'
import { updateValueAtPath } from '../utils/formMutation'

export interface ProtoMessageRendererContextValue {
  readOnly: boolean
  hideEmptyFields: boolean
  formData: Record<string, unknown>
  schemasLoaded: boolean
  expanded: Set<string>
  oneOfSelections: Map<string, string>
  searchQuery: string
  toggleExpand: (path: string) => void
  updateValue: (path: string, value: unknown) => void
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
  formData: Record<string, unknown>
  schemasLoaded: boolean
  expanded: Set<string>
  oneOfSelections: Map<string, string>
  searchQuery: string
  readOnly: boolean
  hideEmptyFields: boolean
  onToggleExpand: (path: string) => void
  onUpdateForm: (data: Record<string, unknown>) => void
  onSetOneOfSelection: (groupPath: string, fieldName: string) => void
  children: ReactNode
}

export function ProtoMessageRendererProvider({
  formData,
  schemasLoaded,
  expanded,
  oneOfSelections,
  searchQuery,
  readOnly,
  hideEmptyFields,
  onToggleExpand,
  onUpdateForm,
  onSetOneOfSelection,
  children
}: ProtoMessageRendererProviderProps) {
  const updateValue = useCallback((path: string, value: unknown) => {
    onUpdateForm(updateValueAtPath(formData, path, value))
  }, [formData, onUpdateForm])

  const value = useMemo<ProtoMessageRendererContextValue>(() => ({
    readOnly,
    hideEmptyFields,
    formData,
    schemasLoaded,
    expanded,
    oneOfSelections,
    searchQuery,
    toggleExpand: onToggleExpand,
    updateValue,
    setOneOfSelection: onSetOneOfSelection,
  }), [
    readOnly, hideEmptyFields, formData, schemasLoaded,
    expanded, oneOfSelections, searchQuery,
    onToggleExpand, updateValue, onSetOneOfSelection,
  ])

  return (
    <ProtoMessageRendererContext.Provider value={value}>
      {children}
    </ProtoMessageRendererContext.Provider>
  )
}

