// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * SchemaRenderer - A clean protobuf message form renderer
 * 
 * Based on proto3 spec: https://protobuf.dev/programming-guides/proto3/
 * 
 * Handles:
 * - Scalar types: string, bytes, bool, int32, int64, uint32, uint64, etc.
 * - Enumerations: Fields with predefined values
 * - Messages: Nested composite types (recursive)
 * - Repeated fields: Arrays of any type
 * - Maps: key/value pairs like map<string, Value>
 * - Oneof: Mutually exclusive field groups
 * - Well-known types: Timestamp, wrapper types
 */

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, ChevronsUpDown, ChevronRight } from 'lucide-react'

import { ProtoMessageRendererProvider } from '../../stores/schemaRendererContext'
import MessageRenderer from './MessageRenderer'
import { useSchemaCacheStatus } from '../../hooks/useSchemaCacheStatus'
import { useFormState } from '../../hooks/useFormState'
import type { ProtoMessageRendererProps } from '../../types'

const SchemaRenderer: React.FC<ProtoMessageRendererProps> = ({
  schema,
  data,
  onChange,
  readOnly = false,
  defaultCollapsed = false,
  showControls = true,
  hideEmptyFields = false
}) => {
  const { schemasLoaded } = useSchemaCacheStatus(schema)
  
  const {
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
  } = useFormState(schema, data, onChange, schemasLoaded, defaultCollapsed)

  if (!schema) {
    return (
      <div className="text-sm text-gray-500 p-4 border rounded-lg">
        No schema available
      </div>
    )
  }

  const hasExpandableSections = allPaths.size > 0

  return (
    <ProtoMessageRendererProvider
      formData={formData}
      schemasLoaded={schemasLoaded}
      expanded={expanded}
      oneOfSelections={oneOfSelections}
      searchQuery={searchQuery}
      readOnly={readOnly}
      hideEmptyFields={hideEmptyFields}
      onToggleExpand={toggleExpand}
      onSetOneOfSelection={setOneOfSelection}
    >
      <div className="space-y-4">
        {/* Header with controls */}
        <div className="flex items-center justify-between pb-2 border-b gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {schema.typeName}
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 w-36 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              {/* Expand/Collapse buttons */}
              {hasExpandableSections && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={expandAll}
                    className="h-7 px-2 text-xs"
                    title="Expand all"
                  >
                    <ChevronsUpDown className="w-3 h-3 mr-1" />
                    Expand
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={collapseAll}
                    className="h-7 px-2 text-xs"
                    title="Collapse all"
                  >
                    <ChevronRight className="w-3 h-3 mr-1" />
                    Collapse
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <MessageRenderer
          schema={schema}
          value={formData}
          onChange={updateForm}
          basePath=""
          isRoot={true}
        />
      </div>
    </ProtoMessageRendererProvider>
  )
}

export default SchemaRenderer
