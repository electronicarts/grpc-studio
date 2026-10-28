// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useId, useState } from 'react'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

interface KeyInputProps {
  /** The committed key; empty for a row that hasn't been given one yet. */
  value: string
  /** Every committed key in the collection, this row's own included; the key may not take another row's. */
  existingKeys: ReadonlySet<string>
  onCommit: (key: string) => void
  placeholder: string
  'aria-label': string
  autoFocus?: boolean
  className?: string
  /** How the key looks in read-only views, where it cannot be edited. Defaults to plain text. */
  renderReadOnly?: (key: string) => React.ReactNode
}

function keyError(key: string, ownKey: string, existingKeys: ReadonlySet<string>): string | null {
  if (!key) return 'Required'
  if (key !== ownKey && existingKeys.has(key)) return 'Already exists'
  return null
}

/**
 * Edits a map key, struct field name or mask path. Typing only changes a local draft; the key is committed on
 * blur or Enter, so a half-typed key never collides with another entry. Escape reverts the draft.
 * An empty or duplicate key is not committed and shows an inline error instead.
 * Read-only views show the key through `renderReadOnly` instead of an input.
 */
const KeyInput: React.FC<KeyInputProps> = ({
  value,
  existingKeys,
  onCommit,
  placeholder,
  'aria-label': ariaLabel,
  autoFocus,
  className,
  renderReadOnly = key => <span className="font-mono text-sm">{key}</span>,
}) => {
  const { readOnly } = useProtoMessageRendererContext()
  const errorId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const text = draft ?? value
  const error = touched ? keyError(text.trim(), value, existingKeys) : null

  const commit = () => {
    const key = text.trim()
    const invalid = keyError(key, value, existingKeys) !== null
    setTouched(invalid)
    if (invalid) return
    setDraft(null)
    if (key !== value) onCommit(key)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      setDraft(null)
      setTouched(false)
    }
  }

  if (readOnly) return <>{renderReadOnly(value)}</>

  return (
    <div className={cn('space-y-1', className)}>
      <Input
        value={text}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        autoFocus={autoFocus}
        className={cn('h-8 font-mono text-sm', error && 'border-danger')}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default KeyInput
