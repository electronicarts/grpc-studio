// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Builders for real buf descriptors in tests: describe .proto files as FileDescriptorProto data, the way protoc
 * would, and let buf build the registry. Fields get a JSON name like protoc assigns, since buf uses it verbatim.
 */

import { create, createFileRegistry, type FileRegistry, type MessageInitShape } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label,
  FieldDescriptorProto_Type,
  FileDescriptorSetSchema,
  type FileDescriptorProtoSchema,
} from '@bufbuild/protobuf/wkt'

export const L = FieldDescriptorProto_Label
export const T = FieldDescriptorProto_Type

export type FieldInit = {
  name: string
  number: number
  type: FieldDescriptorProto_Type
  label?: FieldDescriptorProto_Label
  typeName?: string
  oneofIndex?: number
  proto3Optional?: boolean
  defaultValue?: string
}

export function field(init: FieldInit) {
  return {
    label: L.OPTIONAL,
    jsonName: init.name,
    ...init,
  }
}

export function messageField(name: string, number: number, typeName: string, extra: Partial<FieldInit> = {}) {
  return field({ name, number, type: T.MESSAGE, typeName, ...extra })
}

export function enumField(name: string, number: number, typeName: string, extra: Partial<FieldInit> = {}) {
  return field({ name, number, type: T.ENUM, typeName, ...extra })
}

/** A registry built by buf from the given files, which must come after the files they import. */
export function fileRegistry(...files: MessageInitShape<typeof FileDescriptorProtoSchema>[]): FileRegistry {
  return createFileRegistry(create(FileDescriptorSetSchema, { file: files }))
}
