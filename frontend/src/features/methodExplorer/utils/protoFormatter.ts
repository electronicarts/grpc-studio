// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescEnum, DescField, DescMessage } from '@bufbuild/protobuf'
import { usedTypes } from '@bufbuild/protobuf/reflect'
import type { GrpcMethod } from '@/types/grpc'
import { fieldTypeName } from '@/utils/descUtils'
import { MethodKind } from '@grpc-studio/shared'

function formatField(f: DescField): string {
  const label = f.fieldKind === 'list' ? 'repeated ' : ''
  return `  ${label}${fieldTypeName(f, type => type.name)} ${f.name} = ${f.number};`
}

function formatMessage(schema: DescMessage): string {
  const lines = [`message ${schema.name} {`]

  // Fields and oneof groups in .proto source order
  for (const member of schema.members) {
    if (member.kind === 'field') {
      lines.push(formatField(member))
      continue
    }
    lines.push(`  oneof ${member.name} {`)
    for (const f of member.fields) {
      lines.push(`  ${formatField(f)}`)
    }
    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

function formatEnum(desc: DescEnum): string {
  return [`enum ${desc.name} {`, ...desc.values.map(v => `  ${v.name} = ${v.number};`), '}'].join('\n')
}

/**
 * The method as .proto text: its service line, then its request and response messages, followed by every
 * enum and message they use (singular, repeated and map fields, recursively), each printed once.
 *
 * @param serviceName the service's short name, e.g. "PetStoreService"
 */
export function formatMethodProto(
  serviceName: string,
  method: GrpcMethod,
  resolveSchema: (type: string) => DescMessage | null,
  options?: { outputOnly?: boolean },
): string {
  const input = resolveSchema(method.inputType)
  const output = resolveSchema(method.outputType)
  // A type that hasn't loaded yet has only its full name to go by
  const nameOf = (desc: DescMessage | null, fullName: string) =>
    desc?.name ?? fullName.slice(fullName.lastIndexOf('.') + 1)
  const streams = (kinds: string[]) => kinds.includes(method.kind)
  const inputName = nameOf(input, method.inputType)
  const outputName = nameOf(output, method.outputType)
  const clientStreams = streams([MethodKind.CLIENT_STREAMING, MethodKind.BIDI_STREAMING])
  const serverStreams = streams([MethodKind.SERVER_STREAMING, MethodKind.BIDI_STREAMING])
  const inputWrap = clientStreams ? `stream ${inputName}` : inputName
  const outputWrap = serverStreams ? `stream ${outputName}` : outputName

  const blocks = [
    [`service ${serviceName} {`, `  rpc ${method.name}(${inputWrap}) returns (${outputWrap});`, '}'].join('\n'),
  ]

  const printed = new Set<string>()
  for (const root of [options?.outputOnly ? null : input, output]) {
    if (!root) continue
    for (const type of [root, ...usedTypes(root)]) {
      if (printed.has(type.typeName)) continue
      printed.add(type.typeName)
      blocks.push(type.kind === 'message' ? formatMessage(type) : formatEnum(type))
    }
  }

  return blocks.join('\n\n')
}
