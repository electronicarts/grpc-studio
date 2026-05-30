// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function isWellKnownTimestampType(typeName: string): boolean {
  return typeName === 'google.protobuf.Timestamp' || typeName === '.google.protobuf.Timestamp'
}

export function isWellKnownDurationType(typeName: string): boolean {
  return typeName === 'google.protobuf.Duration' || typeName === '.google.protobuf.Duration'
}
