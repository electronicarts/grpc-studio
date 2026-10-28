// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { removeArrayItem, replaceArrayItem } from '@/features/schemaRenderer/utils/collectionMutation'
import { valueMatchesSearch } from '@/features/schemaRenderer/utils/searchUtils'
import { fieldTypeName } from '@/utils/descUtils'
import { defaultElementValue } from '@/features/schemaRenderer/utils/fieldDefaults'
import ScalarField from '@/features/schemaRenderer/components/fields/ScalarField'
import EnumField from '@/features/schemaRenderer/components/fields/EnumField'
import MessageValue from '@/features/schemaRenderer/components/fields/MessageValue'
import MessageFieldFrame from '@/features/schemaRenderer/components/shared/MessageFieldFrame'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'
import AddButton from '@/features/schemaRenderer/components/shared/AddButton'
import RemoveButton from '@/features/schemaRenderer/components/shared/RemoveButton'

interface ListFieldProps {
  field: DescField & { fieldKind: 'list' }
  value: unknown[]
  onChange: (value: unknown[]) => void
  path: string
  presence?: FieldPresence
}

const ListField: React.FC<ListFieldProps> = ({ field, value, onChange, path, presence }) => {
  const { searchQuery } = useProtoMessageRendererContext()

  const allItems = Array.isArray(value) ? value : []

  const filteredItems = searchQuery
    ? allItems.map((item, index) => ({ item, index })).filter(({ item }) => valueMatchesSearch(item, searchQuery))
    : allItems.map((item, index) => ({ item, index }))

  const countDisplay =
    searchQuery && filteredItems.length !== allItems.length
      ? `${filteredItems.length}/${allItems.length}`
      : `${allItems.length}`

  const updateItem = (index: number, nextValue: unknown) => {
    onChange(replaceArrayItem(allItems, index, nextValue))
  }

  return (
    <MessageFieldFrame
      name={field.name}
      typeName={`repeated ${fieldTypeName(field)}`}
      path={path}
      presence={presence}
      bodyClassName="ml-6 space-y-3"
      meta={
        <Badge variant="secondary" className="ml-auto">
          {countDisplay} item{allItems.length !== 1 ? 's' : ''}
        </Badge>
      }
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
            ) : (
              <MessageValue
                schema={field.message}
                name={field.name}
                value={item}
                onChange={val => updateItem(index, val)}
                path={`${path}[${index}]`}
              />
            )}
          </div>
          <RemoveButton label={`item ${index + 1}`} onClick={() => onChange(removeArrayItem(allItems, index))} />
        </div>
      ))}

      {searchQuery && filteredItems.length === 0 && allItems.length > 0 && (
        <div className="text-sm italic text-muted-foreground">No items matching "{searchQuery}"</div>
      )}

      <AddButton noun={field.name} onClick={() => onChange([...allItems, defaultElementValue(field)])} />
    </MessageFieldFrame>
  )
}

export default ListField
