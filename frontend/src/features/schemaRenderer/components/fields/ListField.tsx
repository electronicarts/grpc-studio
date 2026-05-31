// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { removeArrayItem, replaceArrayItem } from '../../utils/collectionMutation'
import { valueMatchesSearch } from '../../utils/searchUtils'
import { getFieldTypeName } from '../../utils/scalarTypeUtils'
import ScalarField from './ScalarField'
import EnumField from './EnumField'
import MessageRenderer from '../core/MessageRenderer'
import MessageFieldFrame from '../shared/MessageFieldFrame'

interface ListFieldProps {
  field: DescField & { fieldKind: 'list' }
  value: unknown[]
  onChange: (value: unknown[]) => void
  path: string
}

const ListField: React.FC<ListFieldProps> = ({ field, value, onChange, path }) => {
  const { readOnly, searchQuery } = useProtoMessageRendererContext()

  const allItems = Array.isArray(value) ? value : []

  const filteredItems = searchQuery
    ? allItems.map((item, index) => ({ item, index }))
        .filter(({ item }) => valueMatchesSearch(item, searchQuery))
    : allItems.map((item, index) => ({ item, index }))

  const countDisplay = searchQuery && filteredItems.length !== allItems.length
    ? `${filteredItems.length}/${allItems.length}`
    : `${allItems.length}`

  const updateItem = (index: number, nextValue: unknown) => {
    onChange(replaceArrayItem(allItems, index, nextValue))
  }

  // Determine element type for type display (e.g., "repeated string", "repeated petstore.v1.Pet")
  const elementType = getFieldTypeName(field.listKind, field)

  return (
    <MessageFieldFrame
      name={field.name}
      typeName={`repeated ${elementType}`}
      path={path}
      bodyClassName="ml-6 space-y-3"
      meta={(
        <Badge variant="secondary" className="ml-auto">
          {countDisplay} item{allItems.length !== 1 ? 's' : ''}
        </Badge>
      )}
    >
      {filteredItems.map(({ item, index }) => (
        <div key={`${path}[${index}]`} className="flex gap-2 items-start border-l-2 border-gray-300 pl-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Item {index + 1}</div>
            {field.listKind === 'scalar' ? (
              <ScalarField
                name={field.name}
                scalar={field.scalar}
                value={item}
                onChange={val => updateItem(index, val)}
              />
            ) : field.listKind === 'enum' ? (
              <EnumField
                name={field.name}
                enumDesc={field.enum}
                value={item as string | number | undefined}
                onChange={val => updateItem(index, val)}
              />
            ) : field.listKind === 'message' ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                <MessageRenderer
                  schema={field.message}
                  value={(item || {}) as Record<string, unknown>}
                  onChange={val => updateItem(index, val)}
                  basePath={`${path}[${index}]`}
                />
              </div>
            ) : null}
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(removeArrayItem(allItems, index))}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}

      {searchQuery && filteredItems.length === 0 && allItems.length > 0 && (
        <div className="text-sm text-gray-500 italic">
          No items matching "{searchQuery}"
        </div>
      )}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newItem = field.listKind === 'scalar' || field.listKind === 'enum' ? '' : {}
            onChange([...allItems, newItem])
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add {field.name}
        </Button>
      )}
    </MessageFieldFrame>
  )
}

export default ListField
