// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { isTimestampType } from '../descUtils'

describe('descUtils - well-known type checks', () => {
  describe('isTimestampType', () => {
    it('should identify google.protobuf.Timestamp', () => {
      expect(isTimestampType('google.protobuf.Timestamp')).toBe(true)
    })

    it('should identify .google.protobuf.Timestamp with leading dot', () => {
      expect(isTimestampType('.google.protobuf.Timestamp')).toBe(true)
    })

    it('should return false for other google.protobuf types', () => {
      expect(isTimestampType('google.protobuf.Duration')).toBe(false)
      expect(isTimestampType('google.protobuf.Struct')).toBe(false)
      expect(isTimestampType('google.protobuf.Any')).toBe(false)
      expect(isTimestampType('google.protobuf.Empty')).toBe(false)
    })

    it('should return false for wrapper types', () => {
      expect(isTimestampType('google.protobuf.StringValue')).toBe(false)
      expect(isTimestampType('google.protobuf.Int32Value')).toBe(false)
      expect(isTimestampType('google.protobuf.BoolValue')).toBe(false)
    })

    it('should return false for custom message types', () => {
      expect(isTimestampType('MyMessage')).toBe(false)
      expect(isTimestampType('com.example.Timestamp')).toBe(false)
      expect(isTimestampType('app.Timestamp')).toBe(false)
    })

    it('should return false for scalar types', () => {
      expect(isTimestampType('string')).toBe(false)
      expect(isTimestampType('int32')).toBe(false)
      expect(isTimestampType('bool')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isTimestampType('google.protobuf.timestamp')).toBe(false)
      expect(isTimestampType('GOOGLE.PROTOBUF.TIMESTAMP')).toBe(false)
      expect(isTimestampType('Google.Protobuf.Timestamp')).toBe(false)
    })

    it('should not match partial strings', () => {
      expect(isTimestampType('Timestamp')).toBe(false)
      expect(isTimestampType('protobuf.Timestamp')).toBe(false)
      expect(isTimestampType('google.protobuf.TimestampValue')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isTimestampType('')).toBe(false)
    })

    it('should handle strings with extra whitespace', () => {
      expect(isTimestampType(' google.protobuf.Timestamp')).toBe(false)
      expect(isTimestampType('google.protobuf.Timestamp ')).toBe(false)
      expect(isTimestampType(' google.protobuf.Timestamp ')).toBe(false)
    })

    it('should return false for similar but different types', () => {
      expect(isTimestampType('google.protobuf.TimestampProto')).toBe(false)
      expect(isTimestampType('google.proto.Timestamp')).toBe(false)
      expect(isTimestampType('.google.proto.Timestamp')).toBe(false)
    })
  })
})
