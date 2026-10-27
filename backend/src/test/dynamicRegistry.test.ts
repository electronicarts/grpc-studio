// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { create, fromJson, toJson } from '@bufbuild/protobuf'
import { AnySchema, FieldDescriptorProto_Type, FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { buildDynamicRegistry } from '../grpc/connect/dynamicRegistry.js'
import { field, fileDescriptor } from './protoFixtures.js'

const fileDescriptorSet = create(FileDescriptorSetSchema, {
  file: [fileDescriptor({
    name: 'outer.proto',
    messageType: [{
      name: 'Outer',
      field: [field('id', 1, FieldDescriptorProto_Type.STRING)],
      nestedType: [{ name: 'Inner', field: [field('label', 1, FieldDescriptorProto_Type.STRING)] }],
    }],
  })],
})

describe('buildDynamicRegistry', () => {
  const registry = buildDynamicRegistry(fileDescriptorSet)

  it('includes reflected top-level and nested messages', () => {
    assert.ok(registry.getMessage('test.Outer'))
    assert.ok(registry.getMessage('test.Outer.Inner'))
  })

  it('includes the well-known types', () => {
    assert.ok(registry.getMessage('google.protobuf.Timestamp'))
    assert.ok(registry.getMessage('google.protobuf.StringValue'))
    assert.ok(registry.getMessage('google.protobuf.FileDescriptorProto'))
  })

  it('decodes an Any holding a nested message type', () => {
    const json = { '@type': 'type.googleapis.com/test.Outer.Inner', label: 'x' }
    const any = fromJson(AnySchema, json, { registry })
    assert.deepEqual(toJson(AnySchema, any, { registry }), json)
  })
})
