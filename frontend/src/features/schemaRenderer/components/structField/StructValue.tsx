// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared'
import { X } from 'lucide-react'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import ScalarField from '../ScalarField'
import { StructArrayItems } from './StructArrayItems'
import { StructObjectFields } from './StructObjectFields'
import {
  STRUCT_KIND_OPTIONS,
  defaultStructValue,
  isJsonObject,
  scalarType,
  structKind,
  structKindFieldName,
  type StructKind,
} from './structValueUtils'

interface StructValueProps {
  label: string
  value: unknown
  onChange: (value: unknown) => void
  onRemove?: () => void
}

export function StructValue({ label, value, onChange, onRemove }: StructValueProps) {
  const { readOnly } = useProtoMessageRendererContext()
  const kind = structKind(value)
  const selectedFieldName = structKindFieldName(kind)

  const renderSelectedValue = () => {
    if (kind === 'list') {
      return <StructArrayItems value={Array.isArray(value) ? value : []} onChange={onChange} />
    }

    if (kind === 'struct') {
      return <StructObjectFields value={isJsonObject(value) ? value : {}} onChange={onChange} />
    }

    if (kind === 'null') {
      return (
        <FormField label={selectedFieldName}>
          <Input value="null" disabled className="w-full" />
        </FormField>
      )
    }

    return (
      <ScalarField
        name={selectedFieldName}
        scalar={scalarType(value)}
        value={value}
        onChange={onChange}
      />
    )
  }

  return (
    <div className="space-y-3 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/20">
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-500 text-white">oneof</Badge>
        <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <span className="text-xs text-gray-500">(google.protobuf.Value)</span>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="ml-auto h-7 w-7 p-0"
            data-testid="structField-removeButton"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <select
        value={kind}
        onChange={(event) => !readOnly && onChange(defaultStructValue(event.target.value as StructKind))}
        disabled={readOnly}
        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-gray-800"
        data-testid="structField-kindSelect"
      >
        {STRUCT_KIND_OPTIONS.map((option) => (
          <option key={option.kind} value={option.kind}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
        {renderSelectedValue()}
      </div>
    </div>
  )
}
