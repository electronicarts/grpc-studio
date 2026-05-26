// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function isWellKnownTimestampType(typeName: string): boolean {
  return typeName === 'google.protobuf.Timestamp' || typeName === '.google.protobuf.Timestamp'
}
