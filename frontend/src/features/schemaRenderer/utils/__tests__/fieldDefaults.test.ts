// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it } from 'vitest'
import { create, createFileRegistry, fromJson, type DescField } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label as L,
  FieldDescriptorProto_Type as T,
  FileDescriptorSetSchema,
  file_google_protobuf_timestamp,
} from '@bufbuild/protobuf/wkt'
import { defaultFieldValue, defaultListItem } from '../fieldDefaults'

const registry = createFileRegistry(create(FileDescriptorSetSchema, {
  file: [
    file_google_protobuf_timestamp.proto,
    {
      name: 'legacy.proto',
      package: 'legacy',
      syntax: 'proto2',
      dependency: ['google/protobuf/timestamp.proto'],
      enumType: [{ name: 'Color', value: [{ name: 'COLOR_BLUE', number: 0 }, { name: 'COLOR_RED', number: 1 }] }],
      messageType: [{
        name: 'Settings',
        oneofDecl: [{ name: 'when' }],
        field: [
          { name: 'count', number: 1, type: T.INT32, label: L.OPTIONAL, defaultValue: '7' },
          { name: 'big', number: 2, type: T.INT64, label: L.OPTIONAL, defaultValue: '9007199254740993' },
          { name: 'color', number: 3, type: T.ENUM, typeName: '.legacy.Color', label: L.OPTIONAL, defaultValue: 'COLOR_RED' },
          { name: 'blob', number: 4, type: T.BYTES, label: L.OPTIONAL, defaultValue: 'hi' },
          { name: 'ratio', number: 5, type: T.DOUBLE, label: L.OPTIONAL, defaultValue: 'inf' },
          { name: 'plain', number: 6, type: T.INT32, label: L.OPTIONAL },
          { name: 'plain_color', number: 7, type: T.ENUM, typeName: '.legacy.Color', label: L.OPTIONAL },
          { name: 'counts', number: 8, type: T.INT32, label: L.REPEATED },
          { name: 'colors', number: 9, type: T.ENUM, typeName: '.legacy.Color', label: L.REPEATED },
          { name: 'times', number: 10, type: T.MESSAGE, typeName: '.google.protobuf.Timestamp', label: L.REPEATED },
          { name: 'bigs', number: 11, type: T.INT64, label: L.REPEATED },
          { name: 'at', number: 12, type: T.MESSAGE, typeName: '.google.protobuf.Timestamp', label: L.OPTIONAL, oneofIndex: 0 },
        ],
      }],
    },
  ],
}))

const settings = registry.getMessage('legacy.Settings')!
const field = (name: string): DescField => settings.fields.find(f => f.name === name)!
const listField = (name: string) => field(name) as DescField & { fieldKind: 'list' }

describe('defaultFieldValue', () => {
  it('uses the default declared in the .proto, in proto JSON form', () => {
    expect(defaultFieldValue(field('count'))).toBe(7)
    expect(defaultFieldValue(field('big'))).toBe('9007199254740993')
    expect(defaultFieldValue(field('color'))).toBe('COLOR_RED')
    expect(defaultFieldValue(field('blob'))).toBe('aGk=')
    expect(defaultFieldValue(field('ratio'))).toBe('Infinity')
  })

  it("falls back to the type's zero value when nothing is declared", () => {
    expect(defaultFieldValue(field('plain'))).toBe(0)
    expect(defaultFieldValue(field('plain_color'))).toBe('COLOR_BLUE')
  })

  it('gives a Timestamp member a valid Timestamp, not {}', () => {
    const value = defaultFieldValue(field('at'))
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

describe('defaultListItem', () => {
  it("starts new items at the element type's zero value", () => {
    expect(defaultListItem(listField('counts'))).toBe(0)
    expect(defaultListItem(listField('bigs'))).toBe('0')
    expect(defaultListItem(listField('colors'))).toBe('COLOR_BLUE')
    expect(typeof defaultListItem(listField('times'))).toBe('string')
  })

  it('produces items buf accepts', () => {
    const json = Object.fromEntries(['counts', 'bigs', 'colors', 'times'].map(n => [n, [defaultListItem(listField(n))]]))
    expect(() => fromJson(settings, json, { registry })).not.toThrow()
  })
})
