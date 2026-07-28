// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { MetadataModel } from '../types'

interface MetadataEditorProps {
  metadata: MetadataModel
  disabled?: boolean
}

/**
 * Key/value editor for user-supplied gRPC request metadata (custom headers).
 * Enabled rows with a non-empty key are sent with the RPC. Auth/identity
 * headers configured on the backend take precedence over conflicting keys.
 */
const MetadataEditor: React.FC<MetadataEditorProps> = ({ metadata, disabled = false }) => {
  return (
    <div className="rounded-md border bg-muted/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Request Metadata</p>
          <p className="text-xs text-muted-foreground">
            Custom gRPC headers sent with the call. Keys are lowercased; auth headers take precedence.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 rounded-full px-3"
          onClick={metadata.addRow}
          disabled={disabled}
        >
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      </div>

      {metadata.rows.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">No metadata. Click Add to send a custom header.</p>
      ) : (
        <div className="space-y-2">
          {metadata.rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Switch
                checked={row.enabled}
                onCheckedChange={(checked) => metadata.updateRow(row.id, { enabled: checked })}
                disabled={disabled}
                aria-label={row.enabled ? 'Disable header' : 'Enable header'}
              />
              <Input
                value={row.key}
                onChange={(e) => metadata.updateRow(row.id, { key: e.target.value })}
                placeholder="header-name"
                disabled={disabled}
                className="h-8 flex-1 font-mono text-xs"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <Input
                value={row.value}
                onChange={(e) => metadata.updateRow(row.id, { value: e.target.value })}
                placeholder="value"
                disabled={disabled}
                className="h-8 flex-1 font-mono text-xs"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0"
                onClick={() => metadata.removeRow(row.id)}
                disabled={disabled}
                aria-label="Remove header"
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-danger" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MetadataEditor
