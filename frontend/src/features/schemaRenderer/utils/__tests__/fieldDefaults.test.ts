// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it } from 'vitest'
import { fromJson, type DescField } from '@bufbuild/protobuf'
import { file_google_protobuf_timestamp } from '@bufbuild/protobuf/wkt'
import { L, T, enumField, field, fileRegistry, messageField } from '@/test/descriptors'
import { defaultFieldValue, defaultElementValue } from '../fieldDefaults'

const registry = fileRegistry(file_google_protobuf_timestamp.proto, {
  name: 'legacy.proto',
  package: 'legacy',
  syntax: 'proto2',
  dependency: ['google/protobuf/timestamp.proto'],
  enumType: [{ name: 'Color', value: [{ name: 'COLOR_BLUE', number: 0 }, { name: 'COLOR_RED', number: 1 }] }],
  messageType: [{
    name: 'Settings',
    oneofDecl: [{ name: 'when' }],
    field: [
      field({ name: 'count', number: 1, type: T.INT32, defaultValue: '7' }),
      field({ name: 'big', number: 2, type: T.INT64, defaultValue: '9007199254740993' }),
      enumField('color', 3, '.legacy.Color', { defaultValue: 'COLOR_RED' }),
      field({ name: 'blob', number: 4, type: T.BYTES, defaultValue: 'hi' }),
      field({ name: 'ratio', number: 5, type: T.DOUBLE, defaultValue: 'inf' }),
      field({ name: 'plain', number: 6, type: T.INT32 }),
      enumField('plain_color', 7, '.legacy.Color'),
      field({ name: 'counts', number: 8, type: T.INT32, label: L.REPEATED }),
      enumField('colors', 9, '.legacy.Color', { label: L.REPEATED }),
      messageField('times', 10, '.google.protobuf.Timestamp', { label: L.REPEATED }),
      field({ name: 'bigs', number: 11, type: T.INT64, label: L.REPEATED }),
      messageField('at', 12, '.google.protobuf.Timestamp', { oneofIndex: 0 }),
    ],
  }],
})

const settings = registry.getMessage('legacy.Settings')!
const fieldNamed = (name: string): DescField => settings.fields.find(f => f.name === name)!
const listField = (name: string) => fieldNamed(name) as DescField & { fieldKind: 'list' }

describe('defaultFieldValue', () => {
  it('uses the default declared in the .proto, in proto JSON form', () => {
    expect(defaultFieldValue(fieldNamed('count'))).toBe(7)
    expect(defaultFieldValue(fieldNamed('big'))).toBe('9007199254740993')
    expect(defaultFieldValue(fieldNamed('color'))).toBe('COLOR_RED')
    expect(defaultFieldValue(fieldNamed('blob'))).toBe('aGk=')
    expect(defaultFieldValue(fieldNamed('ratio'))).toBe('Infinity')
  })

  it("falls back to the type's zero value when nothing is declared", () => {
    expect(defaultFieldValue(fieldNamed('plain'))).toBe(0)
    expect(defaultFieldValue(fieldNamed('plain_color'))).toBe('COLOR_BLUE')
  })

  it('gives a Timestamp member a valid Timestamp, not {}', () => {
    const value = defaultFieldValue(fieldNamed('at'))
    expect(typeof value).toBe('string')
    expect(() => fromJson(settings, { at: value }, { registry })).not.toThrow()
  })

  it('produces values buf accepts for every field', () => {
    const json = Object.fromEntries(settings.fields.map(f => [f.name, defaultFieldValue(f)]))
    delete json.at // oneof: only one member at a time, and it is covered above
    expect(Object.keys(json)).toHaveLength(settings.fields.length - 1)
    expect(() => fromJson(settings, json, { registry })).not.toThrow()
  })
})

describe('defaultElementValue', () => {
  it("starts new items at the element type's zero value", () => {
    expect(defaultElementValue(listField('counts'))).toBe(0)
    expect(defaultElementValue(listField('bigs'))).toBe('0')
    expect(defaultElementValue(listField('colors'))).toBe('COLOR_BLUE')
    expect(typeof defaultElementValue(listField('times'))).toBe('string')
  })

  it('produces items buf accepts', () => {
    const lists = ['counts', 'bigs', 'colors', 'times']
    const json = Object.fromEntries(lists.map(n => [n, [defaultElementValue(listField(n))]]))
    expect(() => fromJson(settings, json, { registry })).not.toThrow()
  })
})
