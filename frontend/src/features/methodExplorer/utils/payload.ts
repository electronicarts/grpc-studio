// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { fromJson, toJson } from '@bufbuild/protobuf'
import type { DescMessage, JsonObject as BufJsonObject } from '@bufbuild/protobuf'
import type { JsonObject } from '@grpc-studio/shared'
import { cloneJsonObject, isJsonObject, isRecord } from '../../../utils/jsonUtils'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'

export interface Payload {
  display: JsonObject
  wire: JsonObject
}

function lookupSchema(type: string): DescMessage | null {
  return schemaCache.getCachedSchema(type)
}

export function canonicalizeProtoJson(
  data: Record<string, unknown>,
  schema: DescMessage | null,
  options: { alwaysEmitImplicit?: boolean } = {},
): JsonObject {
  if (!schema) {
    if (!isJsonObject(data)) {
      throw new Error('Expected request payload to be a JSON object')
    }
    return cloneJsonObject(data)
  }

  const message = fromJson(schema, data as BufJsonObject, { ignoreUnknownFields: false })
  const json = toJson(schema, message, {
    useProtoFieldName: true,
    alwaysEmitImplicit: options.alwaysEmitImplicit ?? false,
  })

  if (!isJsonObject(json)) {
    throw new Error(`Expected ${schema.typeName} to encode to a JSON object`)
  }

  return json
}

export function toWireFormat(
  obj: Record<string, unknown>,
  messageType: string | null,
): Payload {
  const schema = messageType ? lookupSchema(messageType) : null
  const canonical = canonicalizeProtoJson(obj, schema)

  return {
    display: cloneJsonObject(canonical),
    wire: cloneJsonObject(canonical),
  }
}

export function toDisplayFormat(
  obj: unknown,
  messageType: string | null,
): Payload {
  if (!isRecord(obj)) {
    return { display: {}, wire: {} }
  }

  const schema = messageType ? lookupSchema(messageType) : null
  const canonical = canonicalizeProtoJson(obj, schema, { alwaysEmitImplicit: true })

  return {
    display: cloneJsonObject(canonical),
    wire: cloneJsonObject(canonical),
  }
}
