// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Binary (`-bin`) request metadata over a real HTTP/2 connection.
 *
 * Starts an in-process @grpc/grpc-js server and calls it through the real
 * Connect gRPC transport, so the test covers the actual wire encoding: the
 * base64 value accepted from the UI must arrive at the server as the original
 * bytes after the server's gRPC library decodes it.
 */

import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import * as grpc from '@grpc/grpc-js'
import { create, createFileRegistry, toBinary } from '@bufbuild/protobuf'
import type { FileRegistry } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { createGrpcTransport } from '@connectrpc/connect-node'
import { sanitizeRequestMetadata, type JsonValue, type RequestMetadata } from '@grpc-studio/shared'
import { GrpcMethodInvokerService } from '../services/grpcMethodInvokerService.js'
import multiClientManager from '../grpc/multiClientManager.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import type { StreamCallbacks } from '../types/index.js'
import * as protoFixtures from './protoFixtures.js'

// Bytes that are not valid ASCII/UTF-8, so a text round trip would corrupt them.
const BINARY_VALUE = Buffer.from([0x00, 0xff, 0x10, 0x80, 0xfe])
const BINARY_KEY = 'x-trace-bin'

function testRegistry(): FileRegistry {
  const file = protoFixtures.fileDescriptor({
    name: 'binary_metadata_test.proto',
    messageType: [
      { name: 'Request', field: [protoFixtures.field('name', 1, protoFixtures.FieldType.STRING)] },
      { name: 'Response', field: [protoFixtures.field('message', 1, protoFixtures.FieldType.STRING)] },
    ],
    service: [
      {
        name: 'EchoService',
        method: [
          { name: 'Get', inputType: '.test.Request', outputType: '.test.Response' },
          { name: 'List', inputType: '.test.Request', outputType: '.test.Response', serverStreaming: true },
          {
            name: 'Chat',
            inputType: '.test.Request',
            outputType: '.test.Response',
            clientStreaming: true,
            serverStreaming: true,
          },
        ],
      },
    ],
  })
  return createFileRegistry(create(FileDescriptorSetSchema, { file: [file] }))
}

function repository(registry: FileRegistry): ReflectionSchemaRepository {
  const fileDescriptorSet = create(FileDescriptorSetSchema, { file: Array.from(registry.files).map((f) => f.proto) })
  return {
    getFileRegistry: async () => registry,
    getAllFileDescriptorSet: async () => fileDescriptorSet,
  } as unknown as ReflectionSchemaRepository
}

/**
 * gRPC server whose handlers reply with the hex of the bytes grpc-js decoded
 * from the `x-trace-bin` request header (or "missing").
 */
async function startEchoServer(registry: FileRegistry): Promise<{ server: grpc.Server; port: number }> {
  const responseDesc = registry.getMessage('test.Response')
  if (!responseDesc) throw new Error('test.Response descriptor was not built')
  const reply = (metadata: grpc.Metadata): Buffer => {
    const [value] = metadata.get(BINARY_KEY)
    const message = Buffer.isBuffer(value) ? value.toString('hex') : 'missing'
    return Buffer.from(toBinary(responseDesc, create(responseDesc, { message })))
  }
  const raw = (path: string, requestStream: boolean, responseStream: boolean) => ({
    path,
    requestStream,
    responseStream,
    requestSerialize: (b: Buffer) => b,
    requestDeserialize: (b: Buffer) => b,
    responseSerialize: (b: Buffer) => b,
    responseDeserialize: (b: Buffer) => b,
  })

  const server = new grpc.Server()
  server.addService(
    {
      Get: raw('/test.EchoService/Get', false, false),
      List: raw('/test.EchoService/List', false, true),
      Chat: raw('/test.EchoService/Chat', true, true),
    },
    {
      Get: (call: grpc.ServerUnaryCall<Buffer, Buffer>, callback: grpc.sendUnaryData<Buffer>) => {
        callback(null, reply(call.metadata))
      },
      List: (call: grpc.ServerWritableStream<Buffer, Buffer>) => {
        call.write(reply(call.metadata))
        call.end()
      },
      Chat: (call: grpc.ServerDuplexStream<Buffer, Buffer>) => {
        call.on('data', () => call.write(reply(call.metadata)))
        call.on('end', () => call.end())
      },
    }
  )

  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) reject(err)
      else resolve(boundPort)
    })
  })
  return { server, port }
}

/** Run a streaming invocation and collect every response until the stream ends. */
function collectStream(start: (callbacks: StreamCallbacks) => void): Promise<JsonValue[]> {
  return new Promise((resolve, reject) => {
    const received: JsonValue[] = []
    start({
      onData: (data) => received.push(data),
      onEnd: () => resolve(received),
      onError: (error) => reject(new Error(error.formatted)),
    })
  })
}

/** Metadata as it arrives at the backend: base64 entered in the UI, then sanitized at the request boundary. */
function uiMetadata(value: string): RequestMetadata {
  const sanitized = sanitizeRequestMetadata({ [BINARY_KEY]: value })
  assert.equal(sanitized.ok, true, sanitized.error)
  return sanitized.metadata
}

describe('binary (-bin) request metadata over a real gRPC connection', () => {
  const registry = testRegistry()
  let server: grpc.Server
  let invoker: GrpcMethodInvokerService

  before(async () => {
    const started = await startEchoServer(registry)
    server = started.server
    const transport = createGrpcTransport({ baseUrl: `http://127.0.0.1:${started.port}` })
    mock.method(multiClientManager, 'getConnectTransport', () => transport)
    invoker = new GrpcMethodInvokerService(repository(registry))
  })

  after(() => {
    mock.restoreAll()
    server.forceShutdown()
  })

  it('delivers the decoded bytes on unary calls (padded base64)', async () => {
    const result = await invoker.invokeUnary('wire-test', 'test.EchoService', 'Get', {}, uiMetadata(BINARY_VALUE.toString('base64')))
    assert.deepEqual(result.success ? result.data : result.error, { message: BINARY_VALUE.toString('hex') })
  })

  it('delivers the decoded bytes on unary calls (unpadded base64)', async () => {
    const unpadded = BINARY_VALUE.toString('base64').replace(/=+$/, '')
    const result = await invoker.invokeUnary('wire-test', 'test.EchoService', 'Get', {}, uiMetadata(unpadded))
    assert.deepEqual(result.success ? result.data : result.error, { message: BINARY_VALUE.toString('hex') })
  })

  it('delivers the decoded bytes on server-streaming calls', async () => {
    const metadata = uiMetadata(BINARY_VALUE.toString('base64'))
    const received = await collectStream((callbacks) => {
      void invoker.invokeServerStream('wire-test', 'test.EchoService', 'List', {}, callbacks, metadata)
    })
    assert.deepEqual(received, [{ message: BINARY_VALUE.toString('hex') }])
  })

  it('delivers the decoded bytes on bidi-streaming calls', async () => {
    const metadata = uiMetadata(BINARY_VALUE.toString('base64'))
    const received = await collectStream((callbacks) => {
      void invoker.invokeBidiStream('wire-test', 'test.EchoService', 'Chat', (async function* () {
        yield { name: 'first' }
        yield { name: 'second' }
      })(), callbacks, metadata)
    })
    assert.deepEqual(received, [
      { message: BINARY_VALUE.toString('hex') },
      { message: BINARY_VALUE.toString('hex') },
    ])
  })
})
