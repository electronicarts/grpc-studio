// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { useMethodExplorerContext } from '../stores'
import { usePersistentHeight } from '@/hooks/usePersistentHeight'
import { toWireJson } from '../utils/payload'
import { useJsonView } from '../hooks/useJsonView'
import JsonViewSwitch from './JsonViewSwitch'

/**
 * The request's JSON tab. "Request" is the editable JSON, holding exactly the fields ticked in the form.
 * "Wire" is a read-only preview of what the server receives: protobuf drops plain proto3 fields at their
 * default value, so a ticked `false`, `0` or `""` on such a field is absent there.
 */
const RequestJsonView: React.FC = () => {
  const { selectedTarget, request } = useMethodExplorerContext()
  const jsonInput = usePersistentHeight<HTMLTextAreaElement>('grpc-studio-request-json-height', '10rem')
  const json = useJsonView(request.schema !== null, () => toWireJson(JSON.parse(request.body), request.schema, selectedTarget))

  return (
    <div className="space-y-2">
      {json.canShowWire && (
        <JsonViewSwitch view={json.view} onChange={json.setView} fullLabel="Request" fullHint="The fields ticked in the form" />
      )}

      {json.view === 'full' ? (
        <textarea
          ref={jsonInput.ref}
          style={jsonInput.style}
          value={request.body}
          onChange={(e) => request.setBody(e.target.value)}
          aria-label="Request JSON"
          className="min-h-40 w-full resize-y rounded-md border bg-background p-4 font-mono text-sm"
          placeholder="Enter your gRPC request as JSON..."
        />
      ) : json.wireUnavailable ? (
        <p className="text-sm text-destructive">{json.wireText}</p>
      ) : (
        <textarea
          readOnly
          value={json.wireText}
          aria-label="Wire JSON"
          style={jsonInput.style}
          className="min-h-40 w-full resize-y rounded-md border bg-muted/50 p-4 font-mono text-sm"
        />
      )}
    </div>
  )
}

export default RequestJsonView
