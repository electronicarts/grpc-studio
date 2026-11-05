// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { create, createFileRegistry, toBinary, type FileRegistry } from '@bufbuild/protobuf'
import type { MessageInitShape } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FieldDescriptorProtoSchema,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt'
import type { FileDescriptorProto } from '@bufbuild/protobuf/wkt'

const L = FieldDescriptorProto_Label
const T = FieldDescriptorProto_Type

export function field(
  name: string,
  number: number,
  type: FieldDescriptorProto_Type,
  extra: Partial<MessageInitShape<typeof FieldDescriptorProtoSchema>> = {},
): MessageInitShape<typeof FieldDescriptorProtoSchema> {
  return {
    name,
    number,
    type,
    label: L.OPTIONAL,
    jsonName: name,
    ...extra,
  } as MessageInitShape<typeof FieldDescriptorProtoSchema>
}

export function messageField(
  name: string,
  number: number,
  typeName: string,
): MessageInitShape<typeof FieldDescriptorProtoSchema> {
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

/** A real buf registry built from the given files, as reflection would produce. */
export function fileRegistry(...files: FileDescriptorProto[]): FileRegistry {
  return createFileRegistry(create(FileDescriptorSetSchema, { file: files }))
}

export function descriptorBytes(proto: FileDescriptorProto): Uint8Array {
  return toBinary(FileDescriptorProtoSchema, proto)
}

export { FieldDescriptorProto_Type as FieldType }
