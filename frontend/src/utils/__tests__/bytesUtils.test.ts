// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { formatBytes } from '../bytesUtils'

describe('bytesUtils', () => {
  describe('formatBytes', () => {
    it('should format bytes under 1KB', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(100)).toBe('100 B')
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('should format KB correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(2048)).toBe('2.0 KB')
      expect(formatBytes(5120)).toBe('5.0 KB')
      expect(formatBytes(10240)).toBe('10.0 KB')
    })

    it('should format fractional KB', () => {
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(2560)).toBe('2.5 KB')
      expect(formatBytes(3584)).toBe('3.5 KB')
    })

    it('should format MB correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
      expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB')
      expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB')
    })

    it('should format fractional MB', () => {
      expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
      expect(formatBytes(3.7 * 1024 * 1024)).toBe('3.7 MB')
    })

    it('should handle large byte values', () => {
      expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB')
      expect(formatBytes(500 * 1024 * 1024)).toBe('500.0 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1024.0 MB')
    })

    it('should round to one decimal place', () => {
      expect(formatBytes(1536)).toMatch(/^\d+\.\d KB$/)
      expect(formatBytes(1.555 * 1024 * 1024)).toMatch(/^\d+\.\d MB$/)
    })

    it('should handle edge cases at boundaries', () => {
      // Just below 1KB
      expect(formatBytes(1023)).toBe('1023 B')

      // Exactly 1KB
      expect(formatBytes(1024)).toBe('1.0 KB')

      // Just below 1MB
      expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/)

      // Exactly 1MB
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    })

    it('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B')
    })
  })
})
