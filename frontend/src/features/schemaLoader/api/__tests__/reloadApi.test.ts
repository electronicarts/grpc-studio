// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { mergeReloadedTarget } from '../reloadApi'
import type { ApiServer } from '../../../../types/grpc'

const server = (name: string, servicesCount: number): ApiServer => ({
  name,
  target: `localhost:${name}`,
  services: Array.from({ length: servicesCount }, (_, i) => ({
    name: `Svc${i}`,
    fullName: `pkg.${name}.Svc${i}`,
    methods: [],
  })),
})

describe('mergeReloadedTarget', () => {
  it('replaces only the reloaded target, preserving order and other servers', () => {
    const current = [server('A', 1), server('B', 1), server('C', 1)]
    const reloaded = [server('B', 3)]

    const merged = mergeReloadedTarget(current, reloaded, 'B')

    expect(merged.map(s => s.name)).toEqual(['A', 'B', 'C'])
    expect(merged[0].services).toHaveLength(1) // A untouched
    expect(merged[1].services).toHaveLength(3) // B replaced
    expect(merged[2].services).toHaveLength(1) // C untouched
  })

  it('keeps the existing server when the reload returns nothing for the target', () => {
    const current = [server('A', 2)]

    const merged = mergeReloadedTarget(current, [], 'A')

    expect(merged).toHaveLength(1)
    expect(merged[0].services).toHaveLength(2)
  })

  it('is a no-op when the target is not in the current set', () => {
    const current = [server('A', 1)]
    const reloaded = [server('B', 5)]

    const merged = mergeReloadedTarget(current, reloaded, 'B')

    expect(merged).toEqual(current)
  })
})
