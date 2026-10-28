// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it } from 'vitest'
import { create, createFileRegistry } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label as L,
  FieldDescriptorProto_Type as T,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt'
import { MethodKind } from '@grpc-studio/shared'
import { formatMethodProto } from '../protoFormatter'

const registry = createFileRegistry(create(FileDescriptorSetSchema, {
  file: [{
    name: 'zoo.proto',
    package: 'zoo',
    syntax: 'proto3',
    enumType: [
      { name: 'Color', value: [{ name: 'COLOR_UNSPECIFIED', number: 0 }, { name: 'COLOR_RED', number: 1 }] },
      { name: 'Size', value: [{ name: 'SIZE_UNSPECIFIED', number: 0 }] },
      { name: 'Mood', value: [{ name: 'MOOD_UNSPECIFIED', number: 0 }] },
    ],
    messageType: [
      {
        name: 'Animal',
        oneofDecl: [{ name: 'diet' }],
        field: [
          { name: 'name', number: 1, type: T.STRING, label: L.OPTIONAL, jsonName: 'name' },
          { name: 'colors', number: 2, type: T.ENUM, typeName: '.zoo.Color', label: L.REPEATED, jsonName: 'colors' },
          { name: 'sizes', number: 3, type: T.MESSAGE, typeName: '.zoo.Animal.SizesEntry', label: L.REPEATED, jsonName: 'sizes' },
          { name: 'parent', number: 4, type: T.MESSAGE, typeName: '.zoo.Animal', label: L.OPTIONAL, jsonName: 'parent' },
          { name: 'mood', number: 5, type: T.ENUM, typeName: '.zoo.Mood', label: L.OPTIONAL, jsonName: 'mood' },
          { name: 'grams', number: 6, type: T.INT32, label: L.OPTIONAL, oneofIndex: 0, jsonName: 'grams' },
        ],
        nestedType: [{
          name: 'SizesEntry',
          options: { mapEntry: true },
          field: [
            { name: 'key', number: 1, type: T.STRING, label: L.OPTIONAL, jsonName: 'key' },
            { name: 'value', number: 2, type: T.ENUM, typeName: '.zoo.Size', label: L.OPTIONAL, jsonName: 'value' },
          ],
        }],
      },
      { name: 'GetAnimalRequest', field: [{ name: 'animal', number: 1, type: T.MESSAGE, typeName: '.zoo.Animal', label: L.OPTIONAL, jsonName: 'animal' }] },
    ],
  }],
}))

const method = { name: 'GetAnimal', inputType: 'zoo.GetAnimalRequest', outputType: 'zoo.Animal', kind: MethodKind.UNARY }
const format = (options?: { outputOnly?: boolean }) =>
  formatMethodProto('zoo.ZooService', method, type => registry.getMessage(type) ?? null, options)

describe('formatMethodProto', () => {
  it('prints the service, the messages and every enum they use, each once', () => {
    expect(format()).toBe([
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
    ].join('\n'))
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
    const text = formatMethodProto('zoo.ZooService', { ...method, kind: MethodKind.BIDI_STREAMING }, () => null)
    expect(text).toContain('rpc GetAnimal(stream GetAnimalRequest) returns (stream Animal);')
  })
})
