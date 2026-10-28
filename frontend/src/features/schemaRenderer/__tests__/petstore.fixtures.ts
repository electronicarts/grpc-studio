// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * The real PetStore schema, loaded the way the app loads schemas: buf parses the example server's compiled
 * descriptor set (examples/petstore, kept in sync with petstore.proto via its `proto:generate` script).
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFileRegistry, fromBinary, type DescMessage } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'

// A path, not a URL object: jsdom replaces the global URL class, which node:fs doesn't accept
const descriptorSetPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../examples/petstore/proto/petstore_descriptor.bin')

export const petstoreRegistry = createFileRegistry(fromBinary(FileDescriptorSetSchema, readFileSync(descriptorSetPath)))

function message(typeName: string): DescMessage {
  const desc = petstoreRegistry.getMessage(typeName)
  if (!desc) throw new Error(`Missing ${typeName} in the PetStore descriptor set`)
  return desc
}

export const petSchema = message('petstore.v1.Pet')
export const listPetsResponseSchema = message('petstore.v1.ListPetsResponse')
