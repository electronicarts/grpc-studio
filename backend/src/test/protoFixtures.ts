// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { create, toBinary } from '@bufbuild/protobuf'
import type { MessageInitShape } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FieldDescriptorProtoSchema,
  FileDescriptorProtoSchema,
} from '@bufbuild/protobuf/wkt'
import type { FileDescriptorProto } from '@bufbuild/protobuf/wkt'

const L = FieldDescriptorProto_Label
const T = FieldDescriptorProto_Type

export function field(
  name: string,
  number: number,
  type: FieldDescriptorProto_Type,
  extra: Partial<MessageInitShape<typeof FieldDescriptorProtoSchema>> = {},
) {
  return {
    name,
    number,
    type,
    label: L.OPTIONAL,
    jsonName: name,
    ...extra,
  }
}

export function messageField(name: string, number: number, typeName: string) {
  return field(name, number, T.MESSAGE, { typeName })
}

export function fileDescriptor(
  init: MessageInitShape<typeof FileDescriptorProtoSchema> & { name: string },
): FileDescriptorProto {
  return create(FileDescriptorProtoSchema, {
    package: 'test',
    syntax: 'proto3',
    ...init,
  })
}

export function descriptorBytes(proto: FileDescriptorProto): Uint8Array {
  return toBinary(FileDescriptorProtoSchema, proto)
}

export { FieldDescriptorProto_Type as FieldType }
