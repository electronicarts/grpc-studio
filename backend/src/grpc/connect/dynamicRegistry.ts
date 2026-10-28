// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Dynamic registry builder that combines well-known types with reflected schemas.
 * This enables google.protobuf.Any fields to contain custom message types discovered
 * via reflection, not just WKTs.
 */

import { createRegistry, type Registry } from '@bufbuild/protobuf'
import * as wkt from '@bufbuild/protobuf/wkt'

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
 * Merges reflected registries with the WKTs into one Registry, nested messages included. It can be passed
 * to fromJson/toJson so google.protobuf.Any fields can contain custom types discovered through reflection.
 */
export function withWellKnownTypes(...registries: Registry[]): Registry {
  return createRegistry(wktRegistry, ...registries)
}
