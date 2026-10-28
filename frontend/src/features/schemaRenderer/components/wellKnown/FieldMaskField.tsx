// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { FormField } from '@/components/shared'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { useKeyedRows } from '@/features/schemaRenderer/hooks/useKeyedRows'
import AddButton from '@/features/schemaRenderer/components/shared/AddButton'
import KeyInput from '@/features/schemaRenderer/components/shared/KeyInput'
import RemoveButton from '@/features/schemaRenderer/components/shared/RemoveButton'

interface FieldMaskFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

// Proto3 JSON encodes google.protobuf.FieldMask as a comma-separated string of
// lowerCamelCase field paths (e.g. "user.displayName,email").  We store that
// string internally but present it as a list of paths, added and edited like map
// keys, so users never have to manage comma delimiters manually.
//
// We intentionally do NOT derive available paths from the parent schema because
// FieldMask paths can be deeply nested (owner.address.city), can target specific
// oneOf branches (identification.microchipId), and can only address map/list
// fields atomically.  Showing a flat list of top-level field names would be
// incomplete and misleading.  A developer using FieldMask already knows their
// proto schema — free-text entry per path is the right trade-off.
const FieldMaskField: React.FC<FieldMaskFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const paths =
    typeof value === 'string' && value
      ? value
          .split(',')
          .map(p => p.trim())
          .filter(Boolean)
      : []

  // Paths are unique keys without values, so they reuse the keyed-row editing of maps.
  const { rows, addRow, keys } = useKeyedRows<null>(
    Object.fromEntries(paths.map(path => [path, null])),
    next => {
      const nextPaths = Object.keys(next)
      onChange(nextPaths.length > 0 ? nextPaths.join(',') : undefined)
    },
    () => null,
  )

  const typeMeta = <span className="text-xs text-muted-foreground">(google.protobuf.FieldMask)</span>

  return (
    <FormField label={name} labelMeta={typeMeta}>
      <div className="space-y-2">
        {readOnly
          ? paths.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {paths.map(path => (
                  <span key={path} className="rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
                    {path}
                  </span>
                ))}
              </div>
            )
          : rows.map(row => (
              <div key={row.id} className="flex items-start gap-2">
                <KeyInput
                  value={row.key}
                  existingKeys={keys}
                  onCommit={row.commitKey}
                  placeholder="lowerCamelCase path, e.g. owner.displayName"
                  aria-label={`${name} path`}
                  autoFocus={row.isPending}
                  className="flex-1"
                />
                <RemoveButton label={row.key ? `path ${row.key}` : 'new path'} onClick={row.remove} />
              </div>
            ))}

        {rows.length === 0 && <p className="text-sm italic text-muted-foreground">No paths</p>}

        <AddButton noun="path" onClick={addRow} testId="fieldMask-addButton" />

        <p className="text-xs text-muted-foreground">
          lowerCamelCase paths — supports nesting (e.g. <code>owner.displayName</code>) and oneOf branches
        </p>
      </div>
    </FormField>
  )
}

export default FieldMaskField
