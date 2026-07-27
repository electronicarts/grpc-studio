// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * ApiClient — typed HTTP request abstraction with retry, timeout,
 * and structured error parsing.
 *
 * Outbound header management is handled by headerManager.ts.
 */
import { buildApiUrl, buildCustomApiUrl, getConfig, isConfigLoaded } from '../../config'
import { getHttpRequestHeaders } from '../headers/headerManager'
import { parseErrorResponse } from './apiErrorParser'
import { executeWithRetry, fetchWithTimeout } from './requestHelpers'

// ── types ───────────────────────────────────────────────────────



interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_RETRIES = 0
const DEFAULT_RETRY_DELAY = 1000

// ── ApiClient ───────────────────────────────────────────────────

class ApiClient {
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  async request<T>(
    url: string,
    method: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const timeout = options.timeout ?? getDefaultTimeout()
    const retries = options.retries ?? DEFAULT_RETRIES
    const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY
    const headers = options.headers ?? {}
    const onRetry = options.onRetry

    return executeWithRetry(
      async () => {
        const response = await fetchWithTimeout(
          url,
          {
            method,
            headers: getHttpRequestHeaders(this.defaultHeaders, headers),
            body: body ? JSON.stringify(body) : undefined
          },
          timeout
        )

        const responseText = await response.text()

        if (!response.ok) {
          const error = parseErrorResponse(responseText, response.status)
          throw new ApiClientError(error.message, error.code, error.status, error.details)
        }

        if (!responseText) return {} as T
        const parsed = JSON.parse(responseText)
        // Unwrap the standard backend envelope { success, data, timestamp }
        if (parsed && typeof parsed === 'object' && parsed.success === true && 'data' in parsed) {
          return parsed.data as T
        }
        return parsed as T
      },
      retries,
      retryDelay,
      onRetry
    )
  }

  async get<T>(endpoint: Parameters<typeof buildApiUrl>[0], options?: RequestOptions): Promise<T> {
    return this.request<T>(buildApiUrl(endpoint), 'GET', undefined, options)
  }

  async post<T>(endpoint: Parameters<typeof buildApiUrl>[0], data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(buildApiUrl(endpoint), 'POST', data, options)
  }

  async getCustom<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(buildCustomApiUrl(path), 'GET', undefined, options)
  }

  async postCustom<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(buildCustomApiUrl(path), 'POST', data, options)
  }
}

function getDefaultTimeout(): number {
  return isConfigLoaded() ? getConfig().api.timeout : DEFAULT_TIMEOUT
}

// ── ApiClientError ──────────────────────────────────────────────

export class ApiClientError extends Error {
  code?: string
  status?: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    code?: string,
    status?: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }

  isCertificateExpired(): boolean {
    return this.code === 'CERTIFICATE_EXPIRED'
  }

  isGrpcError(): boolean {
    return this.message.startsWith('gRPC ')
  }
}

export const apiClient = new ApiClient()
