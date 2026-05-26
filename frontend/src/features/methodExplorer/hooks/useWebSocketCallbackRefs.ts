// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useMemo, useRef } from 'react'
import type { UseGrpcWebSocketOptions } from './useGrpcWebSocket'

export function useWebSocketCallbackRefs(options: UseGrpcWebSocketOptions) {
  const onResponseRef = useRef(options.onResponse)
  const onErrorRef = useRef(options.onError)
  const onCompleteRef = useRef(options.onComplete)
  const onOpenRef = useRef(options.onOpen)
  const onCloseRef = useRef(options.onClose)

  useEffect(() => {
    onResponseRef.current = options.onResponse
    onErrorRef.current = options.onError
    onCompleteRef.current = options.onComplete
    onOpenRef.current = options.onOpen
    onCloseRef.current = options.onClose
  }, [options.onResponse, options.onError, options.onComplete, options.onOpen, options.onClose])

  return useMemo(
    () => ({ onResponseRef, onErrorRef, onCompleteRef, onOpenRef, onCloseRef }),
    [],
  )
}
