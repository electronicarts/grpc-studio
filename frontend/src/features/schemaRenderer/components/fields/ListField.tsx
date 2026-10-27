// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { removeArrayItem, replaceArrayItem } from '../../utils/collectionMutation'
import { valueMatchesSearch } from '../../utils/searchUtils'
import { getFieldTypeName } from '../../utils/scalarTypeUtils'
import ScalarField from './ScalarField'
import EnumField from './EnumField'
import MessageRenderer from '../core/MessageRenderer'
import MessageFieldFrame from '../shared/MessageFieldFrame'
import type { FieldPresence } from '../shared/fieldPresence'
import AddButton from '../shared/AddButton'
import RemoveButton from '../shared/RemoveButton'

interface ListFieldProps {
  field: DescField & { fieldKind: 'list' }
  value: unknown[]
  onChange: (value: unknown[]) => void
  path: string
  presence?: FieldPresence
}

const ListField: React.FC<ListFieldProps> = ({ field, value, onChange, path, presence }) => {
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
      presence={presence}
      bodyClassName="ml-6 space-y-3"
      meta={(
        <Badge variant="secondary" className="ml-auto">
          {countDisplay} item{allItems.length !== 1 ? 's' : ''}
        </Badge>
      )}
    >
      {filteredItems.map(({ item, index }) => (
        <div key={`${path}[${index}]`} className="flex items-start gap-2 border-l-2 border-border pl-3">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted-foreground">Item {index + 1}</div>
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
              <div className="rounded bg-muted p-2">
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
            <RemoveButton label={`item ${index + 1}`} onClick={() => onChange(removeArrayItem(allItems, index))} />
          )}
        </div>
      ))}

      {searchQuery && filteredItems.length === 0 && allItems.length > 0 && (
        <div className="text-sm italic text-muted-foreground">
          No items matching "{searchQuery}"
        </div>
      )}

      {!readOnly && (
        <AddButton
          noun={field.name}
          onClick={() => {
            const newItem = field.listKind === 'scalar' || field.listKind === 'enum' ? '' : {}
            onChange([...allItems, newItem])
          }}
        />
      )}
    </MessageFieldFrame>
  )
}

export default ListField
