// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { formatBytes } from '../../../utils/dateFormatters'

interface ResponseMetadataProps {
  time?: number | null
  size?: number | null
}

export function ResponseMetadata({ time, size }: ResponseMetadataProps) {
  return (
    <>
      {time != null && (
        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full font-mono">
          {time}ms
        </span>
      )}
      {size != null && (
        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-mono">
          {formatBytes(size)}
        </span>
      )}
    </>
  )
}
