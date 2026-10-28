// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescEnum, DescField, DescMessage } from '@bufbuild/protobuf'
import { usedTypes } from '@bufbuild/protobuf/reflect'
import type { GrpcMethod } from '../../../types/grpc'
import { fieldTypeName } from '../../../utils/descUtils'
import { MethodKind } from '@grpc-studio/shared'

/** The last segment of a fully qualified name, for names that only exist as strings (no descriptor). */
function shortName(fullName: string): string {
  return fullName.slice(fullName.lastIndexOf('.') + 1)
}

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
 */
export function formatMethodProto(
  serviceName: string,
  method: GrpcMethod,
  resolveSchema: (type: string) => DescMessage | null,
  options?: { outputOnly?: boolean }
): string {
  const streams = (kinds: string[]) => kinds.includes(method.kind)
  const inputShort = shortName(method.inputType)
  const outputShort = shortName(method.outputType)
  const inputWrap = streams([MethodKind.CLIENT_STREAMING, MethodKind.BIDI_STREAMING]) ? `stream ${inputShort}` : inputShort
  const outputWrap = streams([MethodKind.SERVER_STREAMING, MethodKind.BIDI_STREAMING]) ? `stream ${outputShort}` : outputShort

  const blocks = [[
    `service ${shortName(serviceName)} {`,
    `  rpc ${method.name}(${inputWrap}) returns (${outputWrap});`,
    '}',
  ].join('\n')]

  const roots = [options?.outputOnly ? null : resolveSchema(method.inputType), resolveSchema(method.outputType)]
  const printed = new Set<string>()
  for (const root of roots) {
    if (!root) continue
    for (const type of [root, ...usedTypes(root)]) {
      if (printed.has(type.typeName)) continue
      printed.add(type.typeName)
      blocks.push(type.kind === 'message' ? formatMessage(type) : formatEnum(type))
    }
  }

  return blocks.join('\n\n')
}
