// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { ScalarType, fromBinary, createFileRegistry } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { base64Decode } from '@bufbuild/protobuf/wire'

export function scalarTypeName(s: ScalarType): string {
  return ScalarType[s].toLowerCase()
}

export function fieldTypeName(field: DescField): string {
  switch (field.fieldKind) {
    case 'scalar':
      return scalarTypeName(field.scalar)
    case 'enum':
      return field.enum.typeName
    case 'message':
      return field.message.typeName
    case 'list':
      if (field.listKind === 'scalar') return scalarTypeName(field.scalar)
      if (field.listKind === 'enum')   return field.enum.typeName
      return field.message.typeName
    case 'map': {
      const key = scalarTypeName(field.mapKey)
      const val =
        field.mapKind === 'scalar' ? scalarTypeName(field.scalar)
        : field.mapKind === 'enum'   ? field.enum.typeName
        : field.message.typeName
      return `map<${key}, ${val}>`
    }
  }
}

export function parseDescriptorIntoMap(
  base64: string,
  target: Map<string, DescMessage>,
): void {
  const fdSet = fromBinary(FileDescriptorSetSchema, base64Decode(base64))
  // A registry iterates every type it holds, nested messages included
  for (const type of createFileRegistry(fdSet)) {
    if (type.kind === 'message') target.set(type.typeName, type)
  }
}
