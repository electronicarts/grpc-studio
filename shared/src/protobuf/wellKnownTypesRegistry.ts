// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createRegistry, type Registry } from '@bufbuild/protobuf'
import * as wkt from '@bufbuild/protobuf/wkt'

// Every well-known type, via the files buf ships them in
const wellKnownTypes: Registry = createRegistry(
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
 * A registry of the given types (registries, files or messages from reflection) plus every well-known type,
 * nested messages included. Passed to fromJson/toJson so google.protobuf.Any fields can contain custom types
 * discovered through reflection, as well as WKTs.
 */
export function withWellKnownTypes(...types: Parameters<typeof createRegistry>): Registry {
  return createRegistry(wellKnownTypes, ...types)
}
