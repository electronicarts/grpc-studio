// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getHistory,
  saveRequest,
  deleteHistoryItem,
  clearHistory,
} from '../requestHistory'

describe('requestHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('target-scoped history storage', () => {
    it('saves history with target-scoped keys', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: 'test' }

      saveRequest(target, service, method, requestObj, requestObj)

      const key = `grpc_history_${target}_${service}_${method}`
      const stored = localStorage.getItem(key)
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].requestBody).toEqual(requestObj)
    })

    it('isolates history per target', () => {
      const service = 'TestService'
      const method = 'TestMethod'
      const request1 = { name: 'server1' }
      const request2 = { name: 'server2' }

      saveRequest('Server1', service, method, request1, request1)
      saveRequest('Server2', service, method, request2, request2)

      const history1 = getHistory('Server1', service, method)
      const history2 = getHistory('Server2', service, method)

      expect(history1).toHaveLength(1)
      expect(history2).toHaveLength(1)
      expect(history1[0].requestBody).toEqual(request1)
      expect(history2[0].requestBody).toEqual(request2)
    })

    it('retrieves correct history for target', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: 'test' }

      saveRequest(target, service, method, requestObj, requestObj)

      const history = getHistory(target, service, method)
      expect(history).toHaveLength(1)
      expect(history[0].requestBody).toEqual(requestObj)
    })

    it('returns empty array for non-existent history', () => {
      const history = getHistory('NonExistent', 'Service', 'Method')
      expect(history).toEqual([])
    })
  })

  describe('history management', () => {
    it('saves request with status', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: 'test' }
      const status = { ok: true, responseTimeMs: 100 }

      saveRequest(target, service, method, requestObj, requestObj, undefined, status)

      const history = getHistory(target, service, method)
      expect(history[0].responseStatus).toEqual(status)
    })

    it('limits history to MAX_HISTORY_SIZE items', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'

      // Save more than MAX_HISTORY_SIZE (50) items
      for (let i = 0; i < 60; i++) {
        saveRequest(target, service, method, { index: i }, { index: i })
      }

      const history = getHistory(target, service, method)
      expect(history.length).toBeLessThanOrEqual(50)

      // Should keep the most recent items
      expect(history[0].requestBody).toEqual({ index: 59 })
    })

    it('deletes specific history item', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'

      saveRequest(target, service, method, { name: 'first' }, { name: 'first' })
      saveRequest(target, service, method, { name: 'second' }, { name: 'second' })

      const history = getHistory(target, service, method)
      const itemId = history[0].id

      deleteHistoryItem(target, service, method, itemId)

      const updatedHistory = getHistory(target, service, method)
      expect(updatedHistory).toHaveLength(1)
      expect(updatedHistory[0].requestBody).toEqual({ name: 'first' })
    })

    it('clears all history for target', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'

      saveRequest(target, service, method, { name: 'first' }, { name: 'first' })
      saveRequest(target, service, method, { name: 'second' }, { name: 'second' })

      clearHistory(target, service, method)

      const history = getHistory(target, service, method)
      expect(history).toEqual([])
    })

    it('does not affect history of other targets when clearing', () => {
      const service = 'TestService'
      const method = 'TestMethod'

      saveRequest('Server1', service, method, { name: 'server1' }, { name: 'server1' })
      saveRequest('Server2', service, method, { name: 'server2' }, { name: 'server2' })

      clearHistory('Server1', service, method)

      const history1 = getHistory('Server1', service, method)
      const history2 = getHistory('Server2', service, method)

      expect(history1).toEqual([])
      expect(history2).toHaveLength(1)
    })
  })

  describe('history item structure', () => {
    it('creates history items with correct structure', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: 'test' }
      const formData = { name: 'test', extra: 'data' }

      saveRequest(target, service, method, requestObj, formData)

      const history = getHistory(target, service, method)
      const item = history[0]

      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('timestamp')
      expect(item.requestBody).toEqual(requestObj)
      expect(item.formData).toEqual(formData)
      expect(typeof item.id).toBe('string')
      expect(typeof item.timestamp).toBe('number')
    })

    it('generates unique IDs for history items', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'

      saveRequest(target, service, method, { name: 'first' }, { name: 'first' })
      saveRequest(target, service, method, { name: 'second' }, { name: 'second' })

      const history = getHistory(target, service, method)
      expect(history[0].id).not.toBe(history[1].id)
    })

    it('orders history items by timestamp descending', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'

      saveRequest(target, service, method, { order: 1 }, { order: 1 })
      // Small delay to ensure different timestamps
      saveRequest(target, service, method, { order: 2 }, { order: 2 })

      const history = getHistory(target, service, method)
      expect(history[0].requestBody).toEqual({ order: 2 })
      expect(history[1].requestBody).toEqual({ order: 1 })
    })
  })

  describe('edge cases', () => {
    it('handles invalid JSON in localStorage gracefully', () => {
      const key = 'grpc_history_Server1_Service_Method'
      localStorage.setItem(key, 'invalid json')

      const history = getHistory('Server1', 'Service', 'Method')
      expect(history).toEqual([])
    })

    it('handles special characters in target names', () => {
      const target = 'prod-server:8080'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: 'test' }

      saveRequest(target, service, method, requestObj, requestObj)

      const history = getHistory(target, service, method)
      expect(history).toHaveLength(1)
    })

    it('handles null and undefined in request objects', () => {
      const target = 'Server1'
      const service = 'TestService'
      const method = 'TestMethod'
      const requestObj = { name: null, value: undefined }

      saveRequest(target, service, method, requestObj, requestObj)

      const history = getHistory(target, service, method)
      expect(history[0].requestBody).toEqual(requestObj)
    })
  })
})
