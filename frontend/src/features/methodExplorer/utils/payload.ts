// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { fromJson, toJson, createRegistry } from '@bufbuild/protobuf'
import type { DescMessage, Registry } from '@bufbuild/protobuf'
import * as wkt from '@bufbuild/protobuf/wkt'
import type { JsonObject, JsonValue } from '@grpc-studio/shared'
import { cloneJsonObject, isJsonObject, isRecord } from '../../../utils/jsonUtils'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { cleanFormData } from '../../../utils/cleanFormData'
import { anyTypeName } from '../../../utils/descUtils'

// Every well-known type, via the files buf ships them in
const wktRegistry: Registry = createRegistry(
  wkt.file_google_protobuf_any,
  wkt.file_google_protobuf_api,
  wkt.file_google_protobuf_compiler_plugin,
  wkt.file_google_protobuf_cpp_features,
  wkt.file_google_protobuf_descriptor,
  wkt.file_google_protobuf_duration,
  wkt.file_google_protobuf_empty,
  wkt.file_google_protobuf_field_mask,
  wkt.file_google_protobuf_go_features,
  wkt.file_google_protobuf_java_features,
  wkt.file_google_protobuf_source_context,
  wkt.file_google_protobuf_struct,
  wkt.file_google_protobuf_timestamp,
  wkt.file_google_protobuf_type,
  wkt.file_google_protobuf_wrappers,
)

/**
 * Builds a dynamic registry with the WKTs and every type loaded from the target server.
 * This allows google.protobuf.Any fields to contain custom reflected types, not just WKTs.
 * Without a target, every loaded type is included.
 */
function buildDynamicRegistry(target?: string): Registry {
  const schemas = target === undefined ? schemaCache.getSchemaMap().values() : schemaCache.getTargetSchemas(target)
  return createRegistry(wktRegistry, ...schemas)
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

interface CanonicalizeOptions {
  target?: string
  /** Emit every field, including plain proto3 fields at their default value. */
  alwaysEmitImplicit?: boolean
  /**
   * Emit exactly the fields present in `data`, normalized, and no others: a field given as `false`, `0` or `""`
   * stays in, and an absent field stays out. The request form relies on this so that its "Send" checkbox and the
   * JSON view agree on every key. Takes precedence over `alwaysEmitImplicit`.
   */
  keepPresentFields?: boolean
}

export function canonicalizeProtoJson(
  data: Record<string, unknown>,
  schema: DescMessage | null,
  options: CanonicalizeOptions = {},
): JsonObject {
  if (!schema) {
    if (!isJsonObject(data)) {
      throw new Error('Expected request payload to be a JSON object')
    }
    return cloneJsonObject(data)
  }

  // Clean undefined values before passing to fromJson
  // Protobuf JSON format doesn't support undefined - fields should be omitted
  const cleanedData = cleanFormData(data) as JsonObject

  // Use dynamic registry so Any fields can contain custom reflected types
  const registry = buildDynamicRegistry(options.target)

  const message = fromJson(schema, cleanedData, { ignoreUnknownFields: false, registry })
  const json = toJson(schema, message, {
    useProtoFieldName: true,
    alwaysEmitImplicit: options.keepPresentFields || (options.alwaysEmitImplicit ?? false),
    registry,
  })

  if (!isJsonObject(json)) {
    throw new Error(`Expected ${schema.typeName} to encode to a JSON object`)
  }

  return options.keepPresentFields ? keepPresentFields(json, cleanedData, schema, registry) : json
}

/**
 * Narrows a message's canonical JSON (emitted with every field) to the fields present in its input.
 * Input keys may use either the proto or the JSON field name. Recurses into nested messages, including list
 * items, map values and Any content; types with their own JSON shape (Timestamp, Struct, wrappers, …) are kept whole.
 */
function keepPresentFields(
  canonical: JsonObject,
  input: Record<string, unknown>,
  schema: DescMessage,
  registry: Registry,
): JsonObject {
  const result: JsonObject = {}
  for (const field of schema.fields) {
    const inputKey = field.name in input ? field.name : field.jsonName in input ? field.jsonName : null
    if (inputKey === null || !(field.name in canonical)) continue

    const value = canonical[field.name]
    const inputValue = input[inputKey]
    // Set for message fields, and for lists and maps whose items are messages
    const nested = field.message

    if (!nested) {
      result[field.name] = value
    } else if (field.fieldKind === 'list' && Array.isArray(value) && Array.isArray(inputValue)) {
      result[field.name] = value.map((item, i) => keepPresentInMessage(item, inputValue[i], nested, registry))
    } else if (field.fieldKind === 'map' && isJsonObject(value) && isRecord(inputValue)) {
      result[field.name] = Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, keepPresentInMessage(item, inputValue[key], nested, registry)]),
      )
    } else {
      result[field.name] = keepPresentInMessage(value, inputValue, nested, registry)
    }
  }
  return result
}

function keepPresentInMessage(
  value: JsonValue,
  input: unknown,
  schema: DescMessage,
  registry: Registry,
): JsonValue {
  if (!isJsonObject(value) || !isRecord(input)) return value

  if (schema.typeName === wkt.AnySchema.typeName) {
    const typeUrl = value['@type']
    const content = typeof typeUrl === 'string' ? registry.getMessage(anyTypeName(typeUrl)) : undefined
    // Any holding a type with its own JSON shape wraps it as { "@type", "value" }, which is kept whole.
    if (!content || wkt.hasCustomJsonRepresentation(content)) return value
    return { '@type': typeUrl, ...keepPresentFields(value, input, content, registry) }
  }

  if (wkt.hasCustomJsonRepresentation(schema)) return value
  return keepPresentFields(value, input, schema, registry)
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

/**
 * The wire form of a message: what protobuf actually encodes, with plain proto3 fields at their default value
 * dropped. Returns null when there is no schema to encode with, or the data isn't a valid message.
 */
export function toWireJson(data: unknown, schema: DescMessage | null, target?: string): JsonObject | null {
  if (!schema || !isRecord(data)) return null
  try {
    return canonicalizeProtoJson(data, schema, { target })
  } catch {
    return null
  }
}
