// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, unknown>
}

const ERROR_PREVIEW_LENGTH = 200
const GRPC_ERROR_PATTERN = /Code:\s*(\w+)\s*Message:\s*(.+?)(?:\n|$)/s

function isHtmlResponse(responseText: string): boolean {
  const trimmed = responseText.trimStart()
  return trimmed.startsWith('<!') || trimmed.startsWith('<html')
}

function parseGrpcError(errorMessage: string, status: number): ApiError | null {
  const grpcMatch = errorMessage.match(GRPC_ERROR_PATTERN)

  if (!grpcMatch) return null

  return {
    message: `gRPC ${grpcMatch[1]}: ${grpcMatch[2].trim()}`,
    code: grpcMatch[1],
    status,
  }
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
