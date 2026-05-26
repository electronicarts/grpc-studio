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

const SCALAR_TYPES = new Set([
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
        tokens.push(<span key={key} className="text-gray-500 dark:text-gray-500 italic">{comment}</span>)
      } else if (punct) {
        tokens.push(<span key={key} className="text-gray-500 dark:text-gray-500">{punct}</span>)
      } else if (fieldNum) {
        tokens.push(<span key={key} className="text-amber-600 dark:text-amber-400">{fieldNum}</span>)
      } else if (word) {
        if (PROTO_KEYWORDS.has(word)) {
          tokens.push(<span key={key} className="text-purple-600 dark:text-purple-400 font-semibold">{word}</span>)
        } else if (SCALAR_TYPES.has(word)) {
          tokens.push(<span key={key} className="text-blue-600 dark:text-blue-400">{word}</span>)
        } else if (word[0] === word[0].toUpperCase() && /^[A-Z]/.test(word)) {
          // PascalCase → message/enum type name
          tokens.push(<span key={key} className="text-teal-600 dark:text-teal-400">{word}</span>)
        } else {
          // field name
          tokens.push(<span key={key} className="text-gray-800 dark:text-gray-200">{word}</span>)
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
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  inline?: boolean
  outputOnly?: boolean
}

const ProtoViewer: React.FC<ProtoViewerProps> = ({ selectedService, selectedMethod, inline = false, outputOnly = false }) => {
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
      (type) => schemaCache.getCachedSchema(type),
      outputOnly ? { outputOnly: true } : undefined
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService.fullName, selectedMethod, cacheSize, outputOnly])

  const highlighted = useMemo(() => highlightProto(protoText), [protoText])

  // Inline mode: always-visible content inside a tab
  if (inline) {
    return (
      <div className="border rounded-md overflow-hidden">
        <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto bg-gray-50 dark:bg-gray-900/50 whitespace-pre max-h-[500px] overflow-y-auto">
          {highlighted}
        </pre>
      </div>
    )
  }

  // Collapsible mode: standalone block
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Code className="w-4 h-4" />
        <span>Proto Definition</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto bg-gray-50 dark:bg-gray-900/50 whitespace-pre">
            {highlighted}
          </pre>
        </div>
      )}
    </div>
  )
}

export default ProtoViewer
