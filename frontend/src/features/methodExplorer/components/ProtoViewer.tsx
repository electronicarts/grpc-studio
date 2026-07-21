// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useMemo, useSyncExternalStore } from 'react'
import { Code, ChevronDown, ChevronRight } from 'lucide-react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { formatMethodProto } from '../utils/protoFormatter'

// Proto syntax highlighting via regex tokenisation
const PROTO_KEYWORDS = new Set([
  'service', 'rpc', 'returns', 'message', 'enum', 'oneof',
  'repeated', 'map', 'stream', 'reserved', 'option', 'import', 'syntax', 'package',
])

// Proto scalar type names for syntax highlighting (not type checking)
const PROTO_SCALARS = new Set([
  'string', 'bytes', 'bool',
  'double', 'float',
  'int32', 'int64', 'uint32', 'uint64',
  'sint32', 'sint64', 'fixed32', 'fixed64',
  'sfixed32', 'sfixed64',
])

function highlightProto(text: string): React.ReactNode[] {
  return text.split('\n').map((line, lineIdx) => {
    const tokens: React.ReactNode[] = []
    // Tokenise: words, numbers after '=', punctuation, whitespace
    const regex = /(\s+)|(\/\/.*)|([{}();,<>])|(=\s*\d+)|([a-zA-Z_][\w.]*)|(.)/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(line)) !== null) {
      const [, ws, comment, punct, fieldNum, word, other] = match
      const key = `${lineIdx}-${match.index}`

      if (ws) {
        tokens.push(ws)
      } else if (comment) {
        tokens.push(<span key={key} className="italic text-muted-foreground">{comment}</span>)
      } else if (punct) {
        tokens.push(<span key={key} className="text-muted-foreground">{punct}</span>)
      } else if (fieldNum) {
        tokens.push(<span key={key} className="text-warning">{fieldNum}</span>)
      } else if (word) {
        if (PROTO_KEYWORDS.has(word)) {
          tokens.push(<span key={key} className="font-semibold text-brand">{word}</span>)
        } else if (PROTO_SCALARS.has(word)) {
          tokens.push(<span key={key} className="text-info">{word}</span>)
        } else if (word[0] === word[0].toUpperCase() && /^[A-Z]/.test(word)) {
          // PascalCase → message/enum type name
          tokens.push(<span key={key} className="text-syntax-type">{word}</span>)
        } else {
          // field name
          tokens.push(<span key={key} className="text-foreground">{word}</span>)
        }
      } else if (other) {
        tokens.push(other)
      }
    }

    return (
      <React.Fragment key={lineIdx}>
        {tokens}
        {lineIdx < text.split('\n').length - 1 ? '\n' : ''}
      </React.Fragment>
    )
  })
}

interface ProtoViewerProps {
  selectedTarget: string
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  inline?: boolean
  outputOnly?: boolean
}

const ProtoViewer: React.FC<ProtoViewerProps> = ({ selectedTarget, selectedService, selectedMethod, inline = false, outputOnly = false }) => {
  const [expanded, setExpanded] = useState(!inline)

  // Re-render when schemas arrive in the cache
  const cacheSize = useSyncExternalStore(
    (cb) => schemaCache.subscribe(cb),
    () => schemaCache.getCacheSize()
  )

  const protoText = useMemo(() => {
    return formatMethodProto(
      selectedService.fullName,
      selectedMethod,
      (type) => schemaCache.getCachedSchema(selectedTarget, type),
      outputOnly ? { outputOnly: true } : undefined
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTarget, selectedService.fullName, selectedMethod, cacheSize, outputOnly])

  const highlighted = useMemo(() => highlightProto(protoText), [protoText])

  // Inline mode: always-visible content inside a tab
  if (inline) {
    return (
      <div className="overflow-hidden rounded-md border">
        <pre className="max-h-[500px] overflow-auto whitespace-pre bg-muted p-4 font-mono text-sm leading-relaxed">
          {highlighted}
        </pre>
      </div>
    )
  }

  // Collapsible mode: standalone block
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-accent"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Code className="size-4" />
        <span>Proto Definition</span>
      </button>
      {expanded && (
        <div className="border-t border-border">
          <pre className="overflow-x-auto whitespace-pre bg-muted p-4 font-mono text-sm leading-relaxed">
            {highlighted}
          </pre>
        </div>
      )}
    </div>
  )
}

export default ProtoViewer
