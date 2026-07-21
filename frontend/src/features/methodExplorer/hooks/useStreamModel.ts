// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useRef, useCallback } from 'react'
import type { StreamModel } from '../types'
import type { TabStreamSnapshot } from '@/stores'

export function useStreamModel(restored?: TabStreamSnapshot): StreamModel {
  // A restored tab has no live socket (streaming tabs never unmount), so it is
  // always inactive on remount — we only rehydrate the accumulated messages.
  const [active, setActive] = useState(false)
  const [completed, setCompleted] = useState(restored?.completed ?? false)
  const [messages, setMessages] = useState<unknown[]>(restored?.messages ?? [])
  const [sentMessages, setSentMessages] = useState<Record<string, unknown>[]>(restored?.sentMessages ?? [])
  const [isStreamingResponse, setStreamingResponse] = useState(false)

  const messagesRef = useRef<unknown[]>(restored?.messages ?? [])
  const requestRef = useRef<Record<string, unknown> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const begin = useCallback(() => {
    messagesRef.current = []
    requestRef.current = null
    startTimeRef.current = Date.now()
    setMessages([])
    setSentMessages([])
    setActive(false)
    setCompleted(false)
    setStreamingResponse(false)
  }, [])

  const start = useCallback((request: Record<string, unknown>) => {
    requestRef.current = request
    setSentMessages([request])
    setActive(true)
    setCompleted(false)
  }, [])

  const appendReceived = useCallback((message: unknown) => {
    const next = [...messagesRef.current, message]
    messagesRef.current = next
    setMessages(next)
    setStreamingResponse(true)
    return next
  }, [])

  const addSent = useCallback((message: Record<string, unknown>) => {
    setSentMessages(current => [...current, message])
  }, [])

  const currentRequest = useCallback(() => requestRef.current, [])
  const currentMessages = useCallback(() => messagesRef.current, [])
  const durationMs = useCallback(() => (
    startTimeRef.current ? Date.now() - startTimeRef.current : undefined
  ), [])
  const deactivate = useCallback(() => setActive(false), [])
  const complete = useCallback(() => {
    setActive(false)
    setCompleted(true)
  }, [])

  const reset = useCallback(() => {
    messagesRef.current = []
    requestRef.current = null
    startTimeRef.current = null
    setMessages([])
    setSentMessages([])
    setActive(false)
    setCompleted(false)
    setStreamingResponse(false)
  }, [])

  return {
    active, completed, messages, sentMessages, isStreamingResponse,
    begin, start, appendReceived, addSent, currentRequest, currentMessages, durationMs, deactivate, complete, reset,
  }
}
