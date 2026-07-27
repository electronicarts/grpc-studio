// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, unknown>
}

const ERROR_PREVIEW_LENGTH = 200
const GRPC_ERROR_PATTERN = /Code:\s*(\w+).*?Message:\s*(.+?)(?:\n|$)/s

export interface ParsedGrpcError {
  message: string
  code: string
}

/**
 * Parse a gRPC error string (e.g. "Code: NotFound  Message: entity not found")
 * into a structured object, or null if it isn't a recognizable gRPC error.
 */
export function parseGrpcErrorString(errorStr: string): ParsedGrpcError | null {
  const match = errorStr.match(GRPC_ERROR_PATTERN)
  if (!match) return null
  return { code: match[1], message: `gRPC ${match[1]}: ${match[2].trim()}` }
}

function isHtmlResponse(responseText: string): boolean {
  const trimmed = responseText.trimStart()
  return trimmed.startsWith('<!') || trimmed.startsWith('<html')
}

function parseGrpcError(errorMessage: string, status: number): ApiError | null {
  const parsed = parseGrpcErrorString(errorMessage)
  if (!parsed) return null
  return { message: parsed.message, code: parsed.code, status }
}

function parseStructuredError(errorData: Record<string, unknown>, status: number): ApiError {
  if (errorData.code === 'CERTIFICATE_EXPIRED') {
    return {
      message: typeof errorData.message === 'string' ? errorData.message : 'Certificate expired',
      code: 'CERTIFICATE_EXPIRED',
      status,
      details: errorData.details as Record<string, unknown> | undefined,
    }
  }

  if (errorData.error) {
    const errorMessage = typeof errorData.error === 'string'
      ? errorData.error
      : (errorData.error as { message?: string })?.message ?? 'Unknown error'

    return parseGrpcError(errorMessage, status) ?? {
      message: errorMessage || 'Unknown error',
      status,
    }
  }

  const fallbackMessage = errorData.message ?? errorData.details ?? `HTTP ${status}`

  return {
    message: typeof fallbackMessage === 'string' ? fallbackMessage : JSON.stringify(fallbackMessage),
    status,
  }
}

export function parseErrorResponse(responseText: string, status: number): ApiError {
  try {
    return parseStructuredError(JSON.parse(responseText), status)
  } catch {
    if (isHtmlResponse(responseText)) {
      return { message: `Backend unreachable (HTTP ${status})`, status }
    }

    return {
      message: responseText.slice(0, ERROR_PREVIEW_LENGTH) || `HTTP ${status}`,
      status,
    }
  }
}
