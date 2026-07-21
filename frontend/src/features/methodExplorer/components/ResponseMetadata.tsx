// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { formatBytes } from '../../../utils/bytesUtils'

interface ResponseMetadataProps {
  time?: number | null
  size?: number | null
}

export function ResponseMetadata({ time, size }: ResponseMetadataProps) {
  return (
    <>
      {time != null && (
        <span className="rounded-full bg-success/10 px-2 py-0.5 font-mono text-xs text-success">
          {time}ms
        </span>
      )}
      {size != null && (
        <span className="rounded-full bg-info/10 px-2 py-0.5 font-mono text-xs text-info">
          {formatBytes(size)}
        </span>
      )}
    </>
  )
}
