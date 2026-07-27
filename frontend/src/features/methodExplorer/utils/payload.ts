// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { fromJson, toJson, createRegistry } from '@bufbuild/protobuf'
import type { DescMessage, JsonObject as BufJsonObject, Registry } from '@bufbuild/protobuf'
import * as wkt from '@bufbuild/protobuf/wkt'
import type { JsonObject } from '@grpc-studio/shared'
import { cloneJsonObject, isJsonObject, isRecord } from '../../../utils/jsonUtils'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { cleanFormData } from '../../../utils/cleanFormData'

// Base registry with all well-known types
const wktRegistry: Registry = createRegistry(
  ...(Object.values(wkt).filter(
    (v) => typeof v === 'object' && v !== null && 'typeName' in v && 'fields' in v
  ) as DescMessage[])
)

/**
 * Builds a dynamic registry that includes both WKTs and all types from the schema cache.
 * This allows google.protobuf.Any fields to contain custom reflected types, not just WKTs.
 */
function buildDynamicRegistry(): Registry {
  const schemas = Array.from(schemaCache.getSchemaMap().values())
  return createRegistry(...Array.from(wktRegistry), ...schemas)
}

export interface Payload {
  display: JsonObject
  wire: JsonObject
}

function lookupSchema(target: string | undefined, type: string): DescMessage | null {
  // Need target to lookup schema - if not provided, return null
  if (!target) return null
  return schemaCache.getCachedSchema(target, type)
}

export function canonicalizeProtoJson(
  data: Record<string, unknown>,
  schema: DescMessage | null,
  options: { target?: string; alwaysEmitImplicit?: boolean} = {},
): JsonObject {
  if (!schema) {
    if (!isJsonObject(data)) {
      throw new Error('Expected request payload to be a JSON object')
    }
    return cloneJsonObject(data)
  }

  // Clean undefined values before passing to fromJson
  // Protobuf JSON format doesn't support undefined - fields should be omitted
  const cleanedData = cleanFormData(data) as BufJsonObject

  // Use dynamic registry so Any fields can contain custom reflected types
  const registry = buildDynamicRegistry()

  const message = fromJson(schema, cleanedData, { ignoreUnknownFields: false, registry })
  const json = toJson(schema, message, {
    useProtoFieldName: true,
    alwaysEmitImplicit: options.alwaysEmitImplicit ?? false,
    registry,
  })

  if (!isJsonObject(json)) {
    throw new Error(`Expected ${schema.typeName} to encode to a JSON object`)
  }

  return json
}

export function toWireFormat(
  obj: Record<string, unknown>,
  messageType: string | null,
  target?: string,
): Payload {
  const schema = messageType ? lookupSchema(target, messageType) : null
  const canonical = canonicalizeProtoJson(obj, schema, { target })

  return {
    display: cloneJsonObject(canonical),
    wire: cloneJsonObject(canonical),
  }
}

export function toDisplayFormat(
  obj: unknown,
  messageType: string | null,
  target?: string,
): Payload {
  if (!isRecord(obj)) {
    return { display: {}, wire: {} }
  }

  const schema = messageType ? lookupSchema(target, messageType) : null
  const canonical = canonicalizeProtoJson(obj, schema, { target, alwaysEmitImplicit: true })

  return {
    display: cloneJsonObject(canonical),
    wire: cloneJsonObject(canonical),
  }
}
