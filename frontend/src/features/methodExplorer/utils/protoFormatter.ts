// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod } from '../../../types/grpc'
import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { fieldTypeName, scalarTypeName } from '../../../utils/descUtils'
import { MethodKind } from '@grpc-studio/shared'

function shortType(fqn: string | undefined): string {
  if (!fqn) return 'unknown'
  const parts = fqn.split('.')
  return parts[parts.length - 1]
}

function formatField(f: DescField, index: number): string {
  const lines: string[] = []
  if (f.fieldKind === 'map') {
    const keyType = scalarTypeName(f.mapKey)
    const valType = f.mapKind === 'message' ? shortType(f.message.typeName)
      : f.mapKind === 'enum' ? shortType(f.enum.typeName)
      : f.scalar !== undefined ? scalarTypeName(f.scalar) : 'unknown'
    lines.push(`  map<${keyType}, ${valType}> ${f.name} = ${f.proto.number};`)
    return lines.join('\n')
  }
  const label = f.fieldKind === 'list' ? 'repeated ' : ''
  const typeName = shortType(fieldTypeName(f))
  lines.push(`  ${label}${typeName} ${f.name} = ${f.proto.number ?? index + 1};`)
  return lines.join('\n')
}

function formatMessage(
  typeName: string,
  schema: DescMessage,
  resolveSchema: (type: string) => DescMessage | null,
  visited: Set<string>
): string {
  const name = shortType(typeName)
  const lines: string[] = []

  lines.push(`message ${name} {`)

  // oneOf groups
  const oneOfFieldNames = new Set<string>()
  for (const oneof of schema.oneofs) {
    lines.push(`  oneof ${oneof.name} {`)
    for (const f of oneof.fields) {
      oneOfFieldNames.add(f.name)
      const ft = shortType(fieldTypeName(f))
      lines.push(`    ${ft} ${f.name} = ${f.proto.number ?? '?'};`)
    }
    lines.push('  }')
  }

  // Regular fields
  let fieldIndex = 0
  for (const f of schema.fields) {
    if (f.oneof === undefined) {
      lines.push(formatField(f, fieldIndex))
    }
    fieldIndex++
  }

  lines.push('}')

  // Collect nested types
  for (const f of schema.fields) {
    if (f.fieldKind === 'enum' && !visited.has(f.enum.typeName)) {
      visited.add(f.enum.typeName)
      lines.push('')
      lines.push(`enum ${shortType(f.enum.typeName)} {`)
      for (const ev of f.enum.values) {
        lines.push(`  ${ev.name} = ${ev.proto.number};`)
      }
      lines.push('}')
    }

    let nestedMessage: DescMessage | null = null
    if (f.fieldKind === 'message') nestedMessage = f.message
    else if (f.fieldKind === 'list' && f.listKind === 'message') nestedMessage = f.message
    else if (f.fieldKind === 'map' && f.mapKind === 'message') nestedMessage = f.message

    if (nestedMessage && !visited.has(nestedMessage.typeName)) {
      visited.add(nestedMessage.typeName)
      lines.push('')
      lines.push(formatMessage(nestedMessage.typeName, nestedMessage, resolveSchema, visited))
    }
  }

  return lines.join('\n')
}

export function formatMethodProto(
  serviceName: string,
  method: GrpcMethod,
  resolveSchema: (type: string) => DescMessage | null,
  options?: { outputOnly?: boolean }
): string {
  const lines: string[] = []

  const svcShort = shortType(serviceName)
  const inputShort = shortType(method.inputType)
  const outputShort = shortType(method.outputType)
  const inputWrap = (method.kind === MethodKind.CLIENT_STREAMING || method.kind === MethodKind.BIDI_STREAMING) ? `stream ${inputShort}` : inputShort
  const outputWrap = (method.kind === MethodKind.SERVER_STREAMING || method.kind === MethodKind.BIDI_STREAMING) ? `stream ${outputShort}` : outputShort
  lines.push(`service ${svcShort} {`)
  lines.push(`  rpc ${method.name}(${inputWrap}) returns (${outputWrap});`)
  lines.push('}')

  const visited = new Set<string>()

  if (!options?.outputOnly) {
    const inputSchema = resolveSchema(method.inputType)
    if (inputSchema) {
      visited.add(method.inputType)
      lines.push('')
      lines.push(formatMessage(method.inputType, inputSchema, resolveSchema, visited))
    }
  }

  const outputSchema = resolveSchema(method.outputType)
  if (outputSchema && !visited.has(method.outputType)) {
    visited.add(method.outputType)
    lines.push('')
    lines.push(formatMessage(method.outputType, outputSchema, resolveSchema, visited))
  }

  return lines.join('\n')
}
