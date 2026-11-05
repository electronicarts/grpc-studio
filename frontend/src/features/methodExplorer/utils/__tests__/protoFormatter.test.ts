// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it } from 'vitest'
import { MethodKind } from '@grpc-studio/shared'
import { L, T, enumField, field, fileRegistry, messageField } from '@/test/descriptors'
import { formatMethodProto } from '@/features/methodExplorer/utils/protoFormatter'

const registry = fileRegistry({
  name: 'zoo.proto',
  package: 'zoo',
  syntax: 'proto3',
  enumType: [
    {
      name: 'Color',
      value: [
        { name: 'COLOR_UNSPECIFIED', number: 0 },
        { name: 'COLOR_RED', number: 1 },
      ],
    },
    { name: 'Size', value: [{ name: 'SIZE_UNSPECIFIED', number: 0 }] },
    { name: 'Mood', value: [{ name: 'MOOD_UNSPECIFIED', number: 0 }] },
  ],
  messageType: [
    {
      name: 'Animal',
      oneofDecl: [{ name: 'diet' }],
      field: [
        field({ name: 'name', number: 1, type: T.STRING }),
        enumField('colors', 2, '.zoo.Color', { label: L.REPEATED }),
        messageField('sizes', 3, '.zoo.Animal.SizesEntry', { label: L.REPEATED }),
        messageField('parent', 4, '.zoo.Animal'),
        enumField('mood', 5, '.zoo.Mood'),
        field({ name: 'grams', number: 6, type: T.INT32, oneofIndex: 0 }),
      ],
      nestedType: [
        {
          name: 'SizesEntry',
          options: { mapEntry: true },
          field: [field({ name: 'key', number: 1, type: T.STRING }), enumField('value', 2, '.zoo.Size')],
        },
      ],
    },
    { name: 'GetAnimalRequest', field: [messageField('animal', 1, '.zoo.Animal')] },
  ],
})

const method = {
  name: 'GetAnimal',
  inputType: 'zoo.GetAnimalRequest',
  outputType: 'zoo.Animal',
  kind: MethodKind.UNARY,
}
const format = (options?: { outputOnly?: boolean }) =>
  formatMethodProto('ZooService', method, type => registry.getMessage(type) ?? null, options)

describe('formatMethodProto', () => {
  it('prints the service, the messages and every enum they use, each once', () => {
    expect(format()).toBe(
      [
        'service ZooService {',
        '  rpc GetAnimal(GetAnimalRequest) returns (Animal);',
        '}',
        '',
        'message GetAnimalRequest {',
        '  Animal animal = 1;',
        '}',
        '',
        // Fields and oneof groups in .proto source order: the diet oneof's field is declared last
        'message Animal {',
        '  string name = 1;',
        '  repeated Color colors = 2;',
        '  map<string, Size> sizes = 3;',
        '  Animal parent = 4;',
        '  Mood mood = 5;',
        '  oneof diet {',
        '    int32 grams = 6;',
        '  }',
        '}',
        '',
        'enum Color {',
        '  COLOR_UNSPECIFIED = 0;',
        '  COLOR_RED = 1;',
        '}',
        '',
        'enum Size {',
        '  SIZE_UNSPECIFIED = 0;',
        '}',
        '',
        'enum Mood {',
        '  MOOD_UNSPECIFIED = 0;',
        '}',
      ].join('\n'),
    )
  })

  it('includes enums used only by repeated and map fields', () => {
    expect(format()).toContain('enum Color {')
    expect(format()).toContain('enum Size {')
  })

  it('prints only the response side when asked', () => {
    const text = format({ outputOnly: true })
    expect(text).not.toContain('message GetAnimalRequest')
    expect(text).toContain('message Animal {')
  })

  it('marks streaming sides', () => {
    const text = formatMethodProto('ZooService', { ...method, kind: MethodKind.BIDI_STREAMING }, () => null)
    expect(text).toContain('rpc GetAnimal(stream GetAnimalRequest) returns (stream Animal);')
  })
})
