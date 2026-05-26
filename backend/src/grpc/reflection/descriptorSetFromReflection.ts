// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Builds FileDescriptorSets from gRPC reflection.
 */

import { create, fromBinary, clone } from '@bufbuild/protobuf'
import { protoCamelCase } from '@bufbuild/protobuf/reflect'
import {
  FileDescriptorSetSchema,
  FileDescriptorProtoSchema,
  DescriptorProtoSchema,
  FieldDescriptorProtoSchema,
} from '@bufbuild/protobuf/wkt'
import type { FileDescriptorProto, FileDescriptorSet } from '@bufbuild/protobuf/wkt'
import type { CallOptions } from '@grpc/grpc-js'
import type { GrpcReflection } from 'grpc-js-reflection-client'
import logger from '../../utils/logger.js'

const descriptorSetLogger = logger.child({ module: 'descriptor-set-from-reflection' })

type DescriptorByteFetchMethods = {
  getProtoDescriptorBySymbol(symbol: string, options?: CallOptions): Promise<Uint8Array[]>
  getProtoDescriptorByFileName(fileName: string, options?: CallOptions): Promise<Uint8Array[]>
}

type CollectedDescriptors = {
  files: Map<string, FileDescriptorProto>
  unresolvedImports: Set<string>
}

/**
 * Build a FileDescriptorSet for `symbol` by BFS-resolving all transitive
 * imports from the gRPC reflection API, using @bufbuild/protobuf directly (no
 * protobufjs round-trip). Callers can then serialize the descriptor set or
 * build their own lookup view from it.
 *
 * A `queued` set is seeded from every filename in the initial
 * `file_containing_symbol` response so we never issue a redundant
 * `file_by_filename` request for a proto that is already in the pipeline.
 * Some servers return `errorResponse` for duplicate or out-of-context
 * requests, which previously caused transitive deps to be silently dropped.
 */
export async function buildFileDescriptorSet(
  client: GrpcReflection,
  symbol: string,
  options: CallOptions = {}
): Promise<FileDescriptorSet> {
  const methods = getDescriptorMethods(client)
  const collected = await collectDescriptorsForSymbol(methods, symbol, options)
  const normalized = normalizeJsonNames(collected.files)
  const pruned = pruneUnresolvedImports(normalized, collected.unresolvedImports)

  return create(FileDescriptorSetSchema, { file: orderDescriptorsByDependency(pruned) })
}

async function collectDescriptorsForSymbol(
  methods: DescriptorByteFetchMethods,
  symbol: string,
  options: CallOptions
): Promise<CollectedDescriptors> {
  const initialFiles = decodeDescriptorBytes(await methods.getProtoDescriptorBySymbol(symbol, options))
  const files = new Map<string, FileDescriptorProto>()
  const unresolvedImports = new Set<string>()
  const queuedNames = new Set(initialFiles.map(file => file.name).filter(isNonEmptyString))
  const queue = [...initialFiles]

  while (queue.length > 0) {
    const file = queue.shift()!
    if (!file.name || files.has(file.name)) continue

    files.set(file.name, file)

    for (const importName of file.dependency) {
      if (queuedNames.has(importName)) continue

      queuedNames.add(importName)
      try {
        const importedFiles = decodeDescriptorBytes(await methods.getProtoDescriptorByFileName(importName, options))
        for (const importedFile of importedFiles) {
          if (importedFile.name) queuedNames.add(importedFile.name)
          queue.push(importedFile)
        }
      } catch (error) {
        unresolvedImports.add(importName)
        logReflectionFetchFailure(importName, error)
      }
    }
  }

  return { files, unresolvedImports }
}

function getDescriptorMethods(client: GrpcReflection): DescriptorByteFetchMethods {
  const candidate = client as unknown as Partial<DescriptorByteFetchMethods>
  if (
    typeof candidate.getProtoDescriptorBySymbol !== 'function' ||
    typeof candidate.getProtoDescriptorByFileName !== 'function'
  ) {
    throw new Error('Reflection client does not expose descriptor methods')
  }

  return candidate as DescriptorByteFetchMethods
}

function decodeDescriptorBytes(bytesList: Uint8Array[]): FileDescriptorProto[] {
  return bytesList.map(bytes => fromBinary(FileDescriptorProtoSchema, bytes))
}

function isNonEmptyString(value: string): value is string {
  return value.length > 0
}

function logReflectionFetchFailure(importName: string, error: unknown): void {
  descriptorSetLogger.warn(`Could not fetch dependency '${importName}' via reflection`, {
    error: error instanceof Error ? error.message : String(error),
  })
}

function pruneUnresolvedImports(
  files: Map<string, FileDescriptorProto>,
  unresolvedImports: Set<string>
): Map<string, FileDescriptorProto> {
  if (unresolvedImports.size === 0) return files

  const pruned = new Map<string, FileDescriptorProto>()

  for (const [name, file] of files) {
    const { file: prunedFile, removedImports } = pruneDependencyList(file, unresolvedImports)
    pruned.set(name, prunedFile)
    if (removedImports.length === 0) continue

    descriptorSetLogger.warn('Pruned unresolved descriptor imports', {
      file: prunedFile.name,
      imports: removedImports,
    })
  }

  return pruned
}

function pruneDependencyList(
  file: FileDescriptorProto,
  unresolvedImports: Set<string>
): { file: FileDescriptorProto, removedImports: string[] } {
  const removedImports: string[] = []
  const indexMap = new Map<number, number>()
  const keptDependencies: string[] = []

  file.dependency.forEach((importName, index) => {
    if (unresolvedImports.has(importName)) {
      removedImports.push(importName)
      return
    }

    indexMap.set(index, keptDependencies.length)
    keptDependencies.push(importName)
  })

  if (removedImports.length === 0) {
    return { file, removedImports }
  }

  const prunedFile = clone(FileDescriptorProtoSchema, file)
  prunedFile.dependency = keptDependencies
  prunedFile.publicDependency = remapDependencyIndexes(file.publicDependency, indexMap)
  prunedFile.weakDependency = remapDependencyIndexes(file.weakDependency, indexMap)

  return { file: prunedFile, removedImports }
}

function remapDependencyIndexes(indexes: number[], indexMap: Map<number, number>): number[] {
  const remapped: number[] = []
  for (const index of indexes) {
    const mapped = indexMap.get(index)
    if (mapped !== undefined) remapped.push(mapped)
  }
  return remapped
}

function normalizeJsonNames(files: Map<string, FileDescriptorProto>): Map<string, FileDescriptorProto> {
  const normalized = new Map<string, FileDescriptorProto>()

  for (const [name, file] of files) {
    const normalizedFile = clone(FileDescriptorProtoSchema, file)
    normalized.set(name, {
      ...normalizedFile,
      syntax: normalizedFile.syntax || 'proto2',
      messageType: file.messageType.map(normalizeMessageJsonNames),
    })
  }

  return normalized
}

function normalizeMessageJsonNames(
  message: FileDescriptorProto['messageType'][number]
): FileDescriptorProto['messageType'][number] {
  const normalized = clone(DescriptorProtoSchema, message)
  normalized.field = message.field.map(field => {
    const normalizedField = clone(FieldDescriptorProtoSchema, field)
    normalizedField.jsonName = normalizedField.jsonName || protoCamelCase(normalizedField.name)
    return normalizedField
  })
  normalized.nestedType = message.nestedType.map(normalizeMessageJsonNames)

  return normalized
}

function orderDescriptorsByDependency(protos: Map<string, FileDescriptorProto>): FileDescriptorProto[] {
  const ordered: FileDescriptorProto[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (proto: FileDescriptorProto): void => {
    if (visited.has(proto.name)) return
    if (visiting.has(proto.name)) return

    visiting.add(proto.name)
    for (const dep of proto.dependency) {
      const depProto = protos.get(dep)
      if (depProto) visit(depProto)
    }
    visiting.delete(proto.name)

    visited.add(proto.name)
    ordered.push(proto)
  }

  for (const proto of protos.values()) {
    visit(proto)
  }

  return ordered
}
