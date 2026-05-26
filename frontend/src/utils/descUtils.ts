// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { ScalarType, fromBinary, createFileRegistry } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { WRAPPER_TYPE_TO_SCALAR } from '../types/protoConstants'
import { isWellKnownTimestampType } from './protobufJson'

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

export function fieldNestedMessage(field: DescField): DescMessage | null {
  if (field.fieldKind === 'message') return field.message
  if (field.fieldKind === 'list' && field.listKind === 'message') return field.message
  if (field.fieldKind === 'map'  && field.mapKind  === 'message') return field.message
  return null
}

export function isTimestampType(typeName: string): boolean {
  return isWellKnownTimestampType(typeName)
}

export function isStructType(typeName: string): boolean {
  return typeName === 'google.protobuf.Struct' || typeName === '.google.protobuf.Struct'
}

export function wrapperPrimitiveType(typeName: string): string | null {
  return WRAPPER_TYPE_TO_SCALAR[typeName] ?? null
}

export function parseDescriptorIntoMap(
  base64: string,
  target: Map<string, DescMessage>,
): void {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const fdSet = fromBinary(FileDescriptorSetSchema, bytes)
  const registry = createFileRegistry(fdSet)

  for (const file of fdSet.file) {
    if (!file.name) continue
    const descFile = registry.getFile(file.name)
    if (!descFile) continue
    collectMessages(descFile.messages, target)
  }
}

function collectMessages(messages: readonly DescMessage[], target: Map<string, DescMessage>): void {
  for (const msg of messages) {
    target.set(msg.typeName, msg)
    if (msg.nestedMessages.length > 0) {
      collectMessages(msg.nestedMessages, target)
    }
  }
}
