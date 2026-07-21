// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/shared'
import { X } from 'lucide-react'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import ScalarField from '../fields/ScalarField'
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
} from '../../utils/structValueUtils'

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
        onChange={(nextValue) => onChange(nextValue ?? defaultStructValue(kind))}
      />
    )
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-brand/30 bg-brand/10 p-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-brand text-white">oneof</Badge>
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">(google.protobuf.Value)</span>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="ml-auto size-7 p-0"
            data-testid="structField-removeButton"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      <Select
        value={kind}
        onChange={(event) => !readOnly && onChange(defaultStructValue(event.target.value as StructKind))}
        disabled={readOnly}
        className="border-brand/30"
        data-testid="structField-kindSelect"
      >
        {STRUCT_KIND_OPTIONS.map((option) => (
          <option key={option.kind} value={option.kind}>
            {option.label}
          </option>
        ))}
      </Select>

      <div className="mt-3 border-t border-brand/30 pt-3">
        {renderSelectedValue()}
      </div>
    </div>
  )
}
