// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useMemo, useState } from 'react'
import { useMethodExplorerContext } from '../stores'
import { usePersistentHeight } from '@/hooks/usePersistentHeight'
import { toWireJson } from '../utils/payload'
import JsonViewSwitch, { type JsonView } from './JsonViewSwitch'

/**
 * The request's JSON tab. "Request" is the editable JSON, holding exactly the fields ticked in the form.
 * "Wire" is a read-only preview of what the server receives: protobuf drops plain proto3 fields at their
 * default value, so a ticked `false`, `0` or `""` on such a field is absent there.
 */
const RequestJsonView: React.FC = () => {
  const { selectedTarget, request } = useMethodExplorerContext()
  const [view, setView] = useState<JsonView>('full')
  const jsonInput = usePersistentHeight<HTMLTextAreaElement>('grpc-studio-request-json-height', '10rem')

  const wire = useMemo(() => {
    if (view !== 'wire') return null
    try {
      const json = toWireJson(JSON.parse(request.body), request.schema, selectedTarget)
      return json ? { json: JSON.stringify(json, null, 2) } : { error: 'The request JSON is not a valid message' }
    } catch {
      return { error: 'The request JSON is not valid JSON' }
    }
  }, [view, request.body, request.schema, selectedTarget])

  return (
    <div className="space-y-2">
      <JsonViewSwitch view={view} onChange={setView} fullLabel="Request" fullHint="The fields ticked in the form" />

      {view === 'full' ? (
        <textarea
          ref={jsonInput.ref}
          style={jsonInput.style}
          value={request.body}
          onChange={(e) => request.setBody(e.target.value)}
          aria-label="Request JSON"
          className="min-h-40 w-full resize-y rounded-md border bg-background p-4 font-mono text-sm"
          placeholder="Enter your gRPC request as JSON..."
        />
      ) : wire?.error ? (
        <p className="text-sm text-destructive">{wire.error}</p>
      ) : (
        <textarea
          readOnly
          value={wire?.json ?? ''}
          aria-label="Wire JSON"
          style={jsonInput.style}
          className="min-h-40 w-full resize-y rounded-md border bg-muted/50 p-4 font-mono text-sm"
        />
      )}
    </div>
  )
}

export default RequestJsonView
