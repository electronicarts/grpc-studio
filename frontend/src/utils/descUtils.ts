// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescEnum, DescField, DescMessage } from '@bufbuild/protobuf'
import { ScalarType, fromBinary, createFileRegistry } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { base64Decode } from '@bufbuild/protobuf/wire'

export function scalarTypeName(s: ScalarType): string {
  return ScalarType[s].toLowerCase()
}

/**
 * A field's type as written in a .proto file, e.g. `string`, `pkg.Status` or `map<string, pkg.Pet>`.
 * `nameOf` picks how enum and message types are named: fully qualified by default, or e.g. `d => d.name`.
 */
export function fieldTypeName(
  field: DescField,
  nameOf: (type: DescEnum | DescMessage) => string = type => type.typeName,
): string {
  switch (field.fieldKind) {
    case 'scalar':
      return scalarTypeName(field.scalar)
    case 'enum':
      return nameOf(field.enum)
    case 'message':
      return nameOf(field.message)
    case 'list':
      if (field.listKind === 'scalar') return scalarTypeName(field.scalar)
      return nameOf(field.listKind === 'enum' ? field.enum : field.message)
    case 'map': {
      const key = scalarTypeName(field.mapKey)
      const val =
        field.mapKind === 'scalar'
          ? scalarTypeName(field.scalar)
          : nameOf(field.mapKind === 'enum' ? field.enum : field.message)
      return `map<${key}, ${val}>`
    }
  }
}

export function parseDescriptorIntoMap(base64: string, target: Map<string, DescMessage>): void {
  const fdSet = fromBinary(FileDescriptorSetSchema, base64Decode(base64))
  // A registry iterates every type it holds, nested messages included
  for (const type of createFileRegistry(fdSet)) {
    if (type.kind === 'message') target.set(type.typeName, type)
  }
}

/** The `@type` URL for a message type in an Any, with the same prefix buf's `anyPack` uses. */
export function anyTypeUrl(typeName: string): string {
  return `type.googleapis.com/${typeName}`
}

/** The message type name in an Any's `@type` URL: everything after the last "/", per the Any spec. */
export function anyTypeName(typeUrl: string): string {
  return typeUrl.slice(typeUrl.lastIndexOf('/') + 1)
}
