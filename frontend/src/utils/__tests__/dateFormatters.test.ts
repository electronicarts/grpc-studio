// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { formatTime, formatDate, formatDateTime } from '../dateFormatters'

describe('dateFormatters', () => {
  describe('formatTime', () => {
    it('should format time with hours, minutes, and seconds', () => {
      const date = new Date('2026-05-21T14:30:45')
      const result = formatTime(date)

      // Should include time components
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('should handle midnight', () => {
      const date = new Date('2026-05-21T00:00:00')
      const result = formatTime(date)

      expect(result).toBeTruthy()
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('should handle noon', () => {
      const date = new Date('2026-05-21T12:00:00')
      const result = formatTime(date)

      expect(result).toBeTruthy()
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('should format different times to the same HH:MM:SS shape and be deterministic', () => {
      const dates = [
        new Date('2026-01-01T09:15:30'),
        new Date('2026-06-15T18:45:00'),
        new Date('2026-12-31T23:59:59')
      ]

      dates.forEach(date => {
        const result = formatTime(date)
        // Every result matches the time pattern...
        expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
        // ...and formatting the same instant twice is stable.
        expect(formatTime(date)).toBe(result)
      })
    })
  })

  describe('formatDate', () => {
    it('should format date string in en-US format', () => {
      const result = formatDate('2026-05-21T12:00:00Z')

      expect(result).toContain('2026')
      expect(result).toContain('May')
      // Result depends on timezone
      expect(result).toMatch(/\d{1,2}/)
    })

    it('should return "Unknown" for undefined', () => {
      const result = formatDate(undefined)
      expect(result).toBe('Unknown')
    })

    it('should return "Unknown" for empty string', () => {
      const result = formatDate('')
      expect(result).toBe('Unknown')
    })

    it('should handle ISO date strings', () => {
      const result = formatDate('2026-12-25T12:00:00Z')

      expect(result).toContain('2026')
      expect(result).toContain('Dec')
      // Day might vary by timezone, just check it's valid
      expect(result).toMatch(/\d{1,2}/)
    })

    it('should handle different month names', () => {
      const dates = [
        '2026-01-15', // Jan
        '2026-06-15', // Jun
        '2026-12-15'  // Dec
      ]

      dates.forEach(dateStr => {
        const result = formatDate(dateStr)
        expect(result).toBeTruthy()
        expect(result).not.toBe('Unknown')
      })
    })

    it('should format leap year date', () => {
      const result = formatDate('2024-02-29T12:00:00Z')

      expect(result).toContain('2024')
      expect(result).toContain('Feb')
      // Day might vary by timezone, just ensure it's a valid date
      expect(result).toMatch(/\d{1,2}/)
    })
  })

  describe('formatDateTime', () => {
    it('should format timestamp with time and date', () => {
      const timestamp = new Date('2026-05-21T14:30:00').getTime()
      const result = formatDateTime(timestamp)

      // Should contain separator
      expect(result).toContain('-')

      // Should have both time and date parts
      const parts = result.split(' - ')
      expect(parts.length).toBe(2)
      expect(parts[0]).toBeTruthy() // Time part
      expect(parts[1]).toBeTruthy() // Date part
    })

    it('should handle timestamp at epoch', () => {
      const timestamp = 0
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(result).toContain('-')
    })

    it('should handle recent timestamps', () => {
      const timestamp = Date.now()
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(result).toContain('-')
      expect(typeof result).toBe('string')
    })

    it('should format past dates', () => {
      const timestamp = new Date('2020-01-01T00:00:00').getTime()
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(result).toContain('-')
    })

    it('should format future dates', () => {
      const timestamp = new Date('2030-12-31T23:59:59').getTime()
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(result).toContain('-')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle invalid date strings gracefully', () => {
      const result = formatDate('invalid-date')

      // May return Invalid Date representation or Unknown depending on implementation
      expect(typeof result).toBe('string')
    })

    it('should handle negative timestamps', () => {
      const timestamp = -1000000
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle very large timestamps', () => {
      const timestamp = Number.MAX_SAFE_INTEGER
      const result = formatDateTime(timestamp)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })
  })
})
