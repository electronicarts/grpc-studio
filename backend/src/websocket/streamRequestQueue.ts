// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export class StreamRequestQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = []
  private readonly waiters: Array<(result: IteratorResult<T>) => void> = []
  private closed = false
  private readonly maxQueueSize: number
  private readonly maxWaiters: number

  constructor(options?: { maxQueueSize?: number; maxWaiters?: number })
  constructor(maxQueueSize?: number)
  constructor(optionsOrMaxQueueSize?: { maxQueueSize?: number; maxWaiters?: number } | number) {
    if (typeof optionsOrMaxQueueSize === 'number') {
      this.maxQueueSize = optionsOrMaxQueueSize
      this.maxWaiters = 100
    } else {
      this.maxQueueSize = optionsOrMaxQueueSize?.maxQueueSize ?? 1000
      this.maxWaiters = optionsOrMaxQueueSize?.maxWaiters ?? 100
    }
  }

  push(value: T): boolean {
    if (this.closed) return false

    // Check queue size before accepting to prevent unbounded memory growth
    if (this.values.length >= this.maxQueueSize) {
      throw new Error(`Stream queue overflow: maximum ${this.maxQueueSize} buffered messages exceeded`)
    }

    const waiter = this.waiters.shift()
    if (waiter) {
      waiter({ done: false, value })
    } else {
      this.values.push(value)
    }

    return true
  }

  isNearCapacity(): boolean {
    return this.values.length > this.maxQueueSize * 0.8
  }

  close(): void {
    if (this.closed) return

    this.closed = true
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined as never })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.next(),
    }
  }

  private next(): Promise<IteratorResult<T>> {
    if (this.values.length > 0) {
      return Promise.resolve({ done: false, value: this.values.shift() as T })
    }

    if (this.closed) {
      return Promise.resolve({ done: true, value: undefined as never })
    }

    if (this.waiters.length >= this.maxWaiters) {
      return Promise.reject(new Error(`Too many waiting consumers: ${this.maxWaiters}`))
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve)
    })
  }
}
