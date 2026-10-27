// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Whether a field is part of the request. Unset means omitted; set means sent, even with a default value.
 */
export interface FieldPresence {
  isSet: boolean
  onToggle: (isSet: boolean) => void
}
