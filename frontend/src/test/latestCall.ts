// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Mock } from 'vitest'

/** The first argument of a mock's most recent call, e.g. the latest form data passed to `onChange`. */
export function latestCall(mock: Mock): Record<string, unknown> {
  return mock.mock.calls[mock.mock.calls.length - 1][0] as Record<string, unknown>
}
