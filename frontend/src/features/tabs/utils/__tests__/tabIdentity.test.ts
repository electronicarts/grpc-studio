// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { makeTabId, matchesSelection, nextDuplicateId } from '../tabIdentity'
import type { MethodTab } from '../../types'
import type { GrpcMethod, GrpcService } from '@/types/grpc'
import { MethodKind } from '@grpc-studio/shared'

const service: GrpcService = { name: 'UserService', fullName: 'com.example.UserService', methods: [] }
const method: GrpcMethod = { name: 'GetUser', inputType: 'Req', outputType: 'Res', kind: MethodKind.UNARY }

const tab = (id: string, overrides: Partial<MethodTab> = {}): MethodTab => ({
  id,
  target: 'Server1',
  service,
  method,
  label: 'GetUser',
  ...overrides,
})

describe('tabIdentity', () => {
  it('makeTabId includes target, service and method', () => {
    expect(makeTabId('Server1', service, method)).toBe('Server1::com.example.UserService::GetUser')
  })

  it('matchesSelection ignores the #n duplicate suffix', () => {
    const selection = { target: 'Server1', service, method }
    expect(matchesSelection(tab('Server1::com.example.UserService::GetUser#2'), selection)).toBe(true)
  })

  it('matchesSelection distinguishes the same method on a different target', () => {
    const selection = { target: 'Server2', service, method }
    expect(matchesSelection(tab('Server1::com.example.UserService::GetUser'), selection)).toBe(false)
  })

  it('nextDuplicateId picks the first free #n suffix', () => {
    const base = 'Server1::com.example.UserService::GetUser'
    const existing = [tab(base), tab(`${base}#1`)]
    expect(nextDuplicateId(existing[0], existing)).toBe(`${base}#2`)
  })
})
