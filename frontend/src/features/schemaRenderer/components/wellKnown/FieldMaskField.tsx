// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { X } from 'lucide-react'
import { FormField } from '../../../../components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { KeyInputAdder } from '../shared/KeyInputAdder'

interface FieldMaskFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

// Proto3 JSON encodes google.protobuf.FieldMask as a comma-separated string of
// lowerCamelCase field paths (e.g. "user.displayName,email").  We store that
// string internally but present it as a list of chips so users never have to
// manage comma delimiters manually.
//
// We intentionally do NOT derive available paths from the parent schema because
// FieldMask paths can be deeply nested (owner.address.city), can target specific
// oneOf branches (identification.microchipId), and can only address map/list
// fields atomically.  Showing a flat list of top-level field names would be
// incomplete and misleading.  A developer using FieldMask already knows their
// proto schema — free-text entry with chip management is the right trade-off.
const FieldMaskField: React.FC<FieldMaskFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const paths = typeof value === 'string' && value
    ? value.split(',').map(p => p.trim()).filter(Boolean)
    : []

  const addPath = (path: string) => {
    const trimmed = path.trim()
    if (!trimmed || paths.includes(trimmed)) return
    onChange([...paths, trimmed].join(','))
  }

  const removePath = (index: number) => {
    const next = paths.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next.join(',') : undefined)
  }

  return (
    <FormField label={name}>
      <div className="space-y-2">
        {/* Path chips */}
        {paths.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {paths.map((path, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md border text-sm font-mono"
              >
                <span>{path}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePath(i)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove path ${path}`}
                    data-testid={`fieldMask-remove-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No paths</p>
        )}

        {/* Free-text add input */}
        {!readOnly && (
          <KeyInputAdder
            keyPlaceholder="lowerCamelCase path, e.g. owner.displayName"
            keyClassName="h-8 font-mono text-sm flex-1"
            buttonLabel="Add"
            buttonIconClassName="w-3 h-3 mr-1"
            buttonClassName="h-8"
            testId="fieldMask-addButton"
            onAdd={(key) => addPath(key)}
          />
        )}

        <p className="text-xs text-muted-foreground">
          lowerCamelCase paths — supports nesting (e.g. <code>owner.displayName</code>) and oneOf branches
        </p>
      </div>
    </FormField>
  )
}

export default FieldMaskField
