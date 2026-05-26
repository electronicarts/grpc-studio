// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback, useRef } from 'react'

export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), timeout)
  }, [timeout])

  return { copied, copy }
}
