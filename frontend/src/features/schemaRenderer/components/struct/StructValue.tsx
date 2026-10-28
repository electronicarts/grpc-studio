// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import ScalarField from '../fields/ScalarField'
import RemoveButton from '../shared/RemoveButton'
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
  /** Shown in place of the label, for struct fields whose name can be edited. */
  labelEditor?: ReactNode
  value: unknown
  onChange: (value: unknown) => void
  onRemove?: () => void
}

export function StructValue({ label, labelEditor, value, onChange, onRemove }: StructValueProps) {
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
        {labelEditor || <span className="font-medium text-foreground">{label}</span>}
        <span className="text-xs text-muted-foreground">(google.protobuf.Value)</span>
        {onRemove && <RemoveButton label={label} onClick={onRemove} className="ml-auto" testId="structField-removeButton" />}
      </div>

      <Select
        value={kind}
        onChange={(event) => onChange(defaultStructValue(event.target.value as StructKind))}
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
