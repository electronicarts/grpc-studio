// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { StreamRequestQueue } from '../websocket/streamRequestQueue.js'

describe('StreamRequestQueue', () => {
  describe('push and iteration', () => {
    it('should buffer values when no waiters are present', async () => {
      const queue = new StreamRequestQueue<number>()

      queue.push(1)
      queue.push(2)
      queue.push(3)
      queue.close()

      const values: number[] = []
      for await (const value of queue) {
        values.push(value)
      }

      assert.deepEqual(values, [1, 2, 3])
    })

    it('should immediately deliver values to waiting consumers', async () => {
      const queue = new StreamRequestQueue<string>()
      const values: string[] = []

      // Start consuming before pushing
      const consumePromise = (async () => {
        for await (const value of queue) {
          values.push(value)
        }
      })()

      // Give consumer time to start waiting
      await new Promise(resolve => setTimeout(resolve, 10))

      // Push values - should deliver immediately to waiter
      queue.push('a')
      queue.push('b')
      queue.close()

      await consumePromise
      assert.deepEqual(values, ['a', 'b'])
    })

    it('should handle mixed buffering and immediate delivery', async () => {
      const queue = new StreamRequestQueue<number>()

      // Buffer some values first
      queue.push(1)
      queue.push(2)

      const values: number[] = []
      const consumePromise = (async () => {
        for await (const value of queue) {
          values.push(value)
          // Pause to allow more pushes
          if (values.length === 2) {
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
      })()

      // Give consumer time to start
      await new Promise(resolve => setTimeout(resolve, 5))

      // Push after consumer started
      queue.push(3)
      queue.close()

      await consumePromise
      assert.deepEqual(values, [1, 2, 3])
    })
  })

  describe('close behavior', () => {
    it('should complete iteration when closed with no buffered values', async () => {
      const queue = new StreamRequestQueue<number>()
      queue.close()

      const values: number[] = []
      for await (const value of queue) {
        values.push(value)
      }

      assert.deepEqual(values, [])
    })

    it('should deliver buffered values before completing', async () => {
      const queue = new StreamRequestQueue<number>()

      queue.push(1)
      queue.push(2)
      queue.close()

      const values: number[] = []
      for await (const value of queue) {
        values.push(value)
      }

      assert.deepEqual(values, [1, 2])
    })

    it('should reject pushes after close', () => {
      const queue = new StreamRequestQueue<number>()
      queue.close()

      const result = queue.push(1)
      assert.equal(result, false)
    })

    it('should resolve waiting consumers when closed', async () => {
      const queue = new StreamRequestQueue<number>()

      const consumePromise = (async () => {
        const values: number[] = []
        for await (const value of queue) {
          values.push(value)
        }
        return values
      })()

      // Give consumer time to wait
      await new Promise(resolve => setTimeout(resolve, 10))
      queue.close()

      const values = await consumePromise
      assert.deepEqual(values, [])
    })

    it('should be idempotent - multiple closes are safe', () => {
      const queue = new StreamRequestQueue<number>()

      assert.doesNotThrow(() => {
        queue.close()
        queue.close()
        queue.close()
      }, 'Multiple closes should not throw')
    })
  })

  describe('capacity limits', () => {
    it('should enforce default max queue size of 1000', () => {
      const queue = new StreamRequestQueue<number>()

      // Fill to capacity
      for (let i = 0; i < 1000; i++) {
        queue.push(i)
      }

      // Next push should throw
      assert.throws(
        () => queue.push(1001),
        /Stream queue overflow: maximum 1000 buffered messages exceeded/
      )
    })

    it('should enforce custom max queue size', () => {
      const queue = new StreamRequestQueue<number>(5)

      for (let i = 0; i < 5; i++) {
        queue.push(i)
      }

      assert.throws(
        () => queue.push(6),
        /Stream queue overflow: maximum 5 buffered messages exceeded/
      )
    })

    it('should allow push when consumer is actively draining queue', async () => {
      const queue = new StreamRequestQueue<number>(5)

      // Push to fill buffer completely
      for (let i = 0; i < 5; i++) {
        queue.push(i)
      }

      // Start consuming to make space
      const consumePromise = (async () => {
        const values: number[] = []
        for await (const value of queue) {
          values.push(value)
        }
        return values
      })()

      // Give consumer time to start draining
      await new Promise(resolve => setTimeout(resolve, 50))

      // Now push more - should succeed as consumer is draining
      assert.doesNotThrow(() => {
        queue.push(10)
        queue.push(11)
      })

      queue.close()
      const values = await consumePromise

      assert.ok(values.length >= 5, 'Should have at least the initial 5 values')
    })

    it('isNearCapacity should return true above 80% capacity', () => {
      const queue = new StreamRequestQueue<number>(10)

      // Push to 80%
      for (let i = 0; i < 8; i++) {
        queue.push(i)
      }

      assert.equal(queue.isNearCapacity(), false)

      // Push one more to exceed 80%
      queue.push(9)
      assert.equal(queue.isNearCapacity(), true)
    })

    it('isNearCapacity should return false when queue is drained', async () => {
      const queue = new StreamRequestQueue<number>(10)

      // Fill queue
      for (let i = 0; i < 9; i++) {
        queue.push(i)
      }

      assert.equal(queue.isNearCapacity(), true)

      // Drain queue
      queue.close()
      for await (const _ of queue) {
        // consume all
      }

      // After draining, should report as empty
      const newQueue = new StreamRequestQueue<number>(10)
      assert.equal(newQueue.isNearCapacity(), false)
    })
  })

  describe('multiple consumers', () => {
    it('should distribute values to multiple async iterators', async () => {
      const queue = new StreamRequestQueue<number>()

      queue.push(1)
      queue.push(2)
      queue.push(3)
      queue.close()

      // Consumer 1
      const values1: number[] = []
      const iter1 = queue[Symbol.asyncIterator]()
      values1.push((await iter1.next()).value)

      // Consumer 2
      const values2: number[] = []
      const iter2 = queue[Symbol.asyncIterator]()
      values2.push((await iter2.next()).value)

      // Both should get values
      assert.equal(values1.length, 1)
      assert.equal(values2.length, 1)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid push/consume cycles', async () => {
      const queue = new StreamRequestQueue<number>(100)
      const pushCount = 50
      const values: number[] = []

      const consumePromise = (async () => {
        for await (const value of queue) {
          values.push(value)
        }
      })()

      // Rapid pushes
      for (let i = 0; i < pushCount; i++) {
        queue.push(i)
      }
      queue.close()

      await consumePromise
      assert.equal(values.length, pushCount)
    })

    it('should handle object types correctly', async () => {
      interface TestData {
        id: number
        name: string
      }

      const queue = new StreamRequestQueue<TestData>(10)

      queue.push({ id: 1, name: 'Alice' })
      queue.push({ id: 2, name: 'Bob' })
      queue.close()

      const values: TestData[] = []
      for await (const value of queue) {
        values.push(value)
      }

      assert.deepEqual(values, [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ])
    })
  })
})
