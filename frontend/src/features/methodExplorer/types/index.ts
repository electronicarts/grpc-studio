// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage } from '@bufbuild/protobuf'

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface RequestModel {
  body: string
  formData: Record<string, unknown>
  formKey: number
  isFormMode: boolean
  schema: DescMessage | null
  loadingSchema: boolean
  validationError: string | null

  setBody(body: string): void
  setFormData(data: Record<string, unknown>): void
  toggleMode(checked: boolean): void
  reset(): void
  clear(): void
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface ResponseModel {
  raw: string
  data: unknown
  time: number | null
  size: number | null
  schema: DescMessage | null
  isFormMode: boolean
  singleExpanded: boolean

  setRaw(r: string): void
  setData(d: unknown): void
  setTime(t: number | null): void
  setSize(s: number | null): void
  setSchema(s: DescMessage | null): void
  setFormMode(m: boolean): void
  setSingleExpanded(e: boolean): void
  clear(): void
}

// ---------------------------------------------------------------------------
// Stream
// ---------------------------------------------------------------------------

export interface StreamModel {
  active: boolean
  completed: boolean
  messages: unknown[]
  sentMessages: Record<string, unknown>[]
  isStreamingResponse: boolean

  begin(): void
  start(request: Record<string, unknown>): void
  appendReceived(message: unknown): unknown[]
  addSent(message: Record<string, unknown>): void
  currentRequest(): Record<string, unknown> | null
  currentMessages(): unknown[]
  durationMs(): number | undefined
  deactivate(): void
  complete(): void
  reset(): void
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface ResponseStatus {
  ok: boolean
  code?: string
  message?: string
  responseTimeMs?: number
  responseSizeBytes?: number
}

export interface RequestHistoryItem {
  id: string
  timestamp: number
  requestBody: Record<string, unknown>
  formData: Record<string, unknown>
  label?: string
  responseStatus?: ResponseStatus
}

export interface HistoryModel {
  items: RequestHistoryItem[]
  visible: boolean

  setVisible(v: boolean): void
  save(obj: Record<string, unknown>, status?: ResponseStatus): void
  parse(item: RequestHistoryItem): { json: string; data: Record<string, unknown> }
  remove(id: string): void
  clearAll(): void
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface MethodInvocation {
  loading: boolean
  error: string | null

  setError(e: string | null): void
  invoke(): Promise<void>
  sendMessage(): void
  endStream(): void
  cancelStream(): void
}
