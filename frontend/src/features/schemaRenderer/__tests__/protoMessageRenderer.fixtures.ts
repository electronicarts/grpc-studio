// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { create, createFileRegistry } from '@bufbuild/protobuf'
import type { DescMessage } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt'

const L = FieldDescriptorProto_Label
const T = FieldDescriptorProto_Type

type FieldInit = {
  name: string
  number: number
  type: FieldDescriptorProto_Type
  label?: FieldDescriptorProto_Label
  typeName?: string
  oneofIndex?: number
}

function field(init: FieldInit) {
  return {
    label: L.OPTIONAL,
    jsonName: init.name,
    ...init,
  }
}

function messageField(name: string, number: number, typeName: string, extra: Partial<FieldInit> = {}) {
  return field({ name, number, type: T.MESSAGE, typeName, ...extra })
}

function enumField(name: string, number: number, typeName: string) {
  return field({ name, number, type: T.ENUM, typeName })
}

const fdSet = create(FileDescriptorSetSchema, {
  file: [
    {
      name: 'google/protobuf/timestamp.proto',
      package: 'google.protobuf',
      syntax: 'proto3',
      messageType: [
        {
          name: 'Timestamp',
          field: [
            field({ name: 'seconds', number: 1, type: T.INT64 }),
            field({ name: 'nanos', number: 2, type: T.INT32 }),
          ],
        },
      ],
    },
    {
      name: 'google/protobuf/struct.proto',
      package: 'google.protobuf',
      syntax: 'proto3',
      enumType: [
        {
          name: 'NullValue',
          value: [
            { name: 'NULL_VALUE', number: 0 },
          ],
        },
      ],
      messageType: [
        {
          name: 'Struct',
          nestedType: [
            {
              name: 'FieldsEntry',
              options: { mapEntry: true },
              field: [
                field({ name: 'key', number: 1, type: T.STRING }),
                messageField('value', 2, '.google.protobuf.Value'),
              ],
            },
          ],
          field: [
            messageField('fields', 1, '.google.protobuf.Struct.FieldsEntry', { label: L.REPEATED }),
          ],
        },
        {
          name: 'Value',
          oneofDecl: [{ name: 'kind' }],
          field: [
            field({ name: 'null_value', number: 1, type: T.ENUM, typeName: '.google.protobuf.NullValue', oneofIndex: 0 }),
            field({ name: 'number_value', number: 2, type: T.DOUBLE, oneofIndex: 0 }),
            field({ name: 'string_value', number: 3, type: T.STRING, oneofIndex: 0 }),
            field({ name: 'bool_value', number: 4, type: T.BOOL, oneofIndex: 0 }),
            messageField('struct_value', 5, '.google.protobuf.Struct', { oneofIndex: 0 }),
            messageField('list_value', 6, '.google.protobuf.ListValue', { oneofIndex: 0 }),
          ],
        },
        {
          name: 'ListValue',
          field: [
            messageField('values', 1, '.google.protobuf.Value', { label: L.REPEATED }),
          ],
        },
      ],
    },
    {
      name: 'schema_renderer_test.proto',
      package: 'test',
      syntax: 'proto3',
      dependency: ['google/protobuf/timestamp.proto', 'google/protobuf/struct.proto'],
      enumType: [
        {
          name: 'Status',
          value: [
            { name: 'STATUS_UNKNOWN', number: 0 },
            { name: 'STATUS_ACTIVE', number: 1 },
            { name: 'STATUS_INACTIVE', number: 2 },
          ],
        },
      ],
      messageType: [
        {
          name: 'NestedValue',
          field: [
            field({ name: 'name', number: 1, type: T.STRING }),
          ],
        },
        {
          name: 'AllScalars',
          field: [
            field({ name: 'stringField', number: 1, type: T.STRING }),
            field({ name: 'int32Field', number: 2, type: T.INT32 }),
            field({ name: 'doubleField', number: 3, type: T.DOUBLE }),
            field({ name: 'boolField', number: 4, type: T.BOOL }),
          ],
        },
        {
          name: 'EnumMessage',
          field: [
            enumField('status', 1, '.test.Status'),
          ],
        },
        {
          name: 'RepeatedFields',
          field: [
            field({ name: 'repeatedString', number: 1, label: L.REPEATED, type: T.STRING }),
          ],
        },
        {
          name: 'MapFields',
          nestedType: [
            {
              name: 'StringToStringEntry',
              options: { mapEntry: true },
              field: [
                field({ name: 'key', number: 1, type: T.STRING }),
                field({ name: 'value', number: 2, type: T.STRING }),
              ],
            },
          ],
          field: [
            messageField('stringToString', 1, '.test.MapFields.StringToStringEntry', { label: L.REPEATED }),
          ],
        },
        {
          name: 'OneofBasic',
          oneofDecl: [{ name: 'testOneof' }],
          field: [
            field({ name: 'id', number: 1, type: T.STRING }),
            field({ name: 'stringOption', number: 2, type: T.STRING, oneofIndex: 0 }),
            field({ name: 'intOption', number: 3, type: T.INT32, oneofIndex: 0 }),
            messageField('messageOption', 4, '.test.NestedValue', { oneofIndex: 0 }),
          ],
        },
        {
          name: 'MultipleOneof',
          oneofDecl: [{ name: 'firstChoice' }, { name: 'secondChoice' }],
          field: [
            field({ name: 'id', number: 1, type: T.STRING }),
            field({ name: 'firstString', number: 2, type: T.STRING, oneofIndex: 0 }),
            field({ name: 'firstInt', number: 3, type: T.INT32, oneofIndex: 0 }),
            field({ name: 'secondString', number: 4, type: T.STRING, oneofIndex: 1 }),
            field({ name: 'secondBool', number: 5, type: T.BOOL, oneofIndex: 1 }),
          ],
        },
        {
          name: 'WellKnownTypes',
          field: [
            field({ name: 'id', number: 1, type: T.STRING }),
            messageField('createdAt', 2, '.google.protobuf.Timestamp'),
          ],
        },
        {
          name: 'StructMessage',
          field: [
            messageField('metadata', 1, '.google.protobuf.Struct'),
          ],
        },
        {
          name: 'OneofItem',
          oneofDecl: [{ name: 'value' }],
          field: [
            field({ name: 'label', number: 1, type: T.STRING }),
            field({ name: 'stringValue', number: 2, type: T.STRING, oneofIndex: 0 }),
            field({ name: 'intValue', number: 3, type: T.INT32, oneofIndex: 0 }),
            messageField('messageValue', 4, '.test.NestedValue', { oneofIndex: 0 }),
          ],
        },
        {
          name: 'RepeatedWithOneof',
          field: [
            messageField('items', 1, '.test.OneofItem', { label: L.REPEATED }),
          ],
        },
        {
          name: 'MapWithOneof',
          nestedType: [
            {
              name: 'EntriesEntry',
              options: { mapEntry: true },
              field: [
                field({ name: 'key', number: 1, type: T.STRING }),
                messageField('value', 2, '.test.OneofItem'),
              ],
            },
          ],
          field: [
            messageField('entries', 1, '.test.MapWithOneof.EntriesEntry', { label: L.REPEATED }),
          ],
        },
        {
          name: 'DeeplyNested',
          field: [
            field({ name: 'name', number: 1, type: T.STRING }),
            messageField('child', 2, '.test.NestedValue'),
          ],
        },
        {
          name: 'Comprehensive',
          oneofDecl: [{ name: 'choice' }],
          field: [
            field({ name: 'id', number: 1, type: T.STRING }),
            enumField('status', 2, '.test.Status'),
            field({ name: 'stringOption', number: 3, type: T.STRING, oneofIndex: 0 }),
            messageField('tags', 4, '.test.MapFields.StringToStringEntry', { label: L.REPEATED }),
          ],
        },
      ],
    },
  ],
})

const registry = createFileRegistry(fdSet)

function schema(typeName: string): DescMessage {
  const desc = registry.getMessage(typeName)
  if (!desc) throw new Error(`Missing test schema ${typeName}`)
  return desc
}

export const allScalarsSchema = schema('test.AllScalars')
export const enumSchema = schema('test.EnumMessage')
export const repeatedFieldsSchema = schema('test.RepeatedFields')
export const mapFieldsSchema = schema('test.MapFields')
export const oneofBasicSchema = schema('test.OneofBasic')
export const multipleOneofSchema = schema('test.MultipleOneof')
export const wellKnownTypesSchema = schema('test.WellKnownTypes')
export const structMessageSchema = schema('test.StructMessage')
export const repeatedWithOneofSchema = schema('test.RepeatedWithOneof')
export const mapWithOneofSchema = schema('test.MapWithOneof')
export const deeplyNestedSchema = schema('test.DeeplyNested')
export const comprehensiveSchema = schema('test.Comprehensive')

export const schemaCache = new Map<string, DescMessage>([
  allScalarsSchema,
  enumSchema,
  repeatedFieldsSchema,
  mapFieldsSchema,
  oneofBasicSchema,
  multipleOneofSchema,
  wellKnownTypesSchema,
  structMessageSchema,
  repeatedWithOneofSchema,
  mapWithOneofSchema,
  deeplyNestedSchema,
  comprehensiveSchema,
  schema('google.protobuf.Timestamp'),
  schema('google.protobuf.Struct'),
  schema('google.protobuf.Value'),
  schema('google.protobuf.ListValue'),
  schema('test.NestedValue'),
  schema('test.OneofItem'),
].map(desc => [desc.typeName, desc]))

export const testData = {
  repeatedWithOneof: {
    items: [
      { label: 'first', stringValue: 'alpha' },
      { label: 'second', intValue: 42 },
      { label: 'third', messageValue: { name: 'nested' } },
    ],
  },
  mapWithOneof: {
    entries: {
      first: { label: 'first', stringValue: 'alpha' },
      second: { label: 'second', intValue: 42 },
      third: { label: 'third', messageValue: { name: 'nested' } },
    },
  },
  deeplyNested: {
    name: 'Root Level',
    child: { name: 'Child Level' },
  },
  comprehensive: {
    id: 'comp-1',
    status: 'STATUS_ACTIVE',
    stringOption: 'chosen',
    tags: { env: 'test' },
  },
}
