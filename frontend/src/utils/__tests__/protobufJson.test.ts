// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { isWellKnownTimestampType } from '../protobufJson'

describe('protobufJson', () => {
  describe('isWellKnownTimestampType', () => {
    it('should identify google.protobuf.Timestamp', () => {
      expect(isWellKnownTimestampType('google.protobuf.Timestamp')).toBe(true)
    })

    it('should identify .google.protobuf.Timestamp with leading dot', () => {
      expect(isWellKnownTimestampType('.google.protobuf.Timestamp')).toBe(true)
    })

    it('should return false for other google.protobuf types', () => {
      expect(isWellKnownTimestampType('google.protobuf.Duration')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.Struct')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.Any')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.Empty')).toBe(false)
    })

    it('should return false for wrapper types', () => {
      expect(isWellKnownTimestampType('google.protobuf.StringValue')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.Int32Value')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.BoolValue')).toBe(false)
    })

    it('should return false for custom message types', () => {
      expect(isWellKnownTimestampType('MyMessage')).toBe(false)
      expect(isWellKnownTimestampType('com.example.Timestamp')).toBe(false)
      expect(isWellKnownTimestampType('app.Timestamp')).toBe(false)
    })

    it('should return false for scalar types', () => {
      expect(isWellKnownTimestampType('string')).toBe(false)
      expect(isWellKnownTimestampType('int32')).toBe(false)
      expect(isWellKnownTimestampType('bool')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isWellKnownTimestampType('google.protobuf.timestamp')).toBe(false)
      expect(isWellKnownTimestampType('GOOGLE.PROTOBUF.TIMESTAMP')).toBe(false)
      expect(isWellKnownTimestampType('Google.Protobuf.Timestamp')).toBe(false)
    })

    it('should not match partial strings', () => {
      expect(isWellKnownTimestampType('Timestamp')).toBe(false)
      expect(isWellKnownTimestampType('protobuf.Timestamp')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.TimestampValue')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isWellKnownTimestampType('')).toBe(false)
    })

    it('should handle strings with extra whitespace', () => {
      expect(isWellKnownTimestampType(' google.protobuf.Timestamp')).toBe(false)
      expect(isWellKnownTimestampType('google.protobuf.Timestamp ')).toBe(false)
      expect(isWellKnownTimestampType(' google.protobuf.Timestamp ')).toBe(false)
    })

    it('should return false for similar but different types', () => {
      expect(isWellKnownTimestampType('google.protobuf.TimestampProto')).toBe(false)
      expect(isWellKnownTimestampType('google.proto.Timestamp')).toBe(false)
      expect(isWellKnownTimestampType('.google.proto.Timestamp')).toBe(false)
    })
  })
})
