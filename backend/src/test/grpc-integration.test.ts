// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * gRPC integration tests — starts the PetStore example server with reflection,
 * then exercises the full discover → descriptor-set → invoke pipeline through
 * the Express HTTP API and WebSocket streaming protocol.
 *
 * Covers all four RPC types with success and error paths:
 *   1. Unary          — POST /api/grpc/invoke
 *   2. Server stream  — WebSocket start → response* → complete
 *   3. Client stream  — WebSocket start → data* → end → response → complete
 *   4. Bidi stream    — WebSocket start → data* → end → response* → complete
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fork, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import path from 'node:path'
import { WebSocket } from 'ws'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE = 'petstore.v1.PetStoreService'
const GRPC_STARTUP_TIMEOUT_MS = 10_000
const WS_RESPONSE_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// Infrastructure: PetStore gRPC server
// ---------------------------------------------------------------------------

let grpcProcess: ChildProcess
let grpcPort: number

async function startGrpcServer(): Promise<number> {
  const serverPath = path.resolve(import.meta.dirname, '../../../example/src/server.js')

  return new Promise<number>((resolve, reject) => {
    const child = fork(serverPath, [], {
      env: { ...process.env, PORT: '0' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    grpcProcess = child

    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('PetStore server did not start in time'))
    }, GRPC_STARTUP_TIMEOUT_MS)

    child.stdout?.on('data', (chunk: Buffer) => {
      const match = chunk.toString().match(/listening on port (\d+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(parseInt(match[1], 10))
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      console.error('[petstore]', chunk.toString().trimEnd())
    })
    child.on('error', (err) => { clearTimeout(timeout); reject(err) })
    child.on('exit', (code) => {
      if (code && code !== 0) { clearTimeout(timeout); reject(new Error(`PetStore exited ${code}`)) }
    })
  })
}

function stopGrpcServer(): Promise<void> {
  if (!grpcProcess || grpcProcess.killed) return Promise.resolve()
  grpcProcess.kill('SIGTERM')
  return once(grpcProcess, 'exit').then(() => {})
}

// ---------------------------------------------------------------------------
// Infrastructure: Express backend (pointed at the dynamic gRPC port)
// ---------------------------------------------------------------------------

let httpServer: Server
let baseUrl: string
let wsUrl: string

async function startBackend(targetPort: number): Promise<void> {
  process.env.GRPC_TARGET_PORT = String(targetPort)

  const { createExpressApp } = await import('../app.js')
  const { createWebSocketServer } = await import('../websocket/websocketServer.js')

  const app = createExpressApp()
  httpServer = createServer(app)
  createWebSocketServer(httpServer)

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address() as { port: number }
      baseUrl = `http://127.0.0.1:${addr.port}`
      wsUrl = `ws://127.0.0.1:${addr.port}/ws/grpc`
      resolve()
    })
  })
}

function stopBackend(): Promise<void> {
  return new Promise((resolve) => httpServer.close(() => resolve()))
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function httpGet(urlPath: string) {
  const res = await fetch(`${baseUrl}${urlPath}`)
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}

async function httpPost(urlPath: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}

/** Invoke a unary RPC and return the parsed envelope. */
async function invokeUnary(method: string, data: unknown) {
  return httpPost('/api/grpc/invoke', { service: SERVICE, method, methodKind: 'unary', data })
}

// ---------------------------------------------------------------------------
// WebSocket helpers
// ---------------------------------------------------------------------------

interface WsFrame { type: string; [key: string]: unknown }

/** Open a WebSocket connection with required Origin header. */
function openWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { headers: { Origin: 'http://localhost:3000' } })
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}

/** Send a JSON frame to the WebSocket. */
function wsSend(ws: WebSocket, frame: WsFrame): void {
  ws.send(JSON.stringify(frame))
}

/**
 * Collect WebSocket frames until `done` returns true or timeout fires.
 * Returns the array of collected frames.
 */
function collectFrames(
  ws: WebSocket,
  done: (frames: WsFrame[]) => boolean,
  timeoutMs = WS_RESPONSE_TIMEOUT_MS,
): Promise<WsFrame[]> {
  return new Promise((resolve, reject) => {
    const frames: WsFrame[] = []
    const timeout = setTimeout(() => {
      ws.removeAllListeners('message')
      reject(new Error(`WebSocket timeout after ${timeoutMs}ms — collected ${frames.length} frames: ${JSON.stringify(frames)}`))
    }, timeoutMs)

    ws.on('message', (raw: Buffer) => {
      const frame = JSON.parse(raw.toString()) as WsFrame
      frames.push(frame)
      if (done(frames)) {
        clearTimeout(timeout)
        ws.removeAllListeners('message')
        resolve(frames)
      }
    })
  })
}

/** Start a streaming RPC and collect frames until `complete` or `error`. */
async function streamRpc(opts: {
  method: string
  methodKind: string
  data?: unknown
  clientMessages?: WsFrame[]
}): Promise<WsFrame[]> {
  const ws = await openWs()
  try {
    wsSend(ws, {
      type: 'start',
      payload: { service: SERVICE, method: opts.method, methodKind: opts.methodKind, data: opts.data },
    })

    if (opts.clientMessages) {
      for (const msg of opts.clientMessages) {
        wsSend(ws, msg)
      }
    }

    return await collectFrames(ws, (frames) =>
      frames.some((f) => f.type === 'complete' || f.type === 'error'),
    )
  } finally {
    ws.close()
  }
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

function assertSuccessEnvelope(res: { status: number; body: Record<string, unknown> }) {
  assert.equal(res.status, 200)
  assert.equal(res.body.success, true)
  assert.ok(res.body.data !== undefined, 'Expected data in envelope')
}

function assertErrorResponse(res: { status: number; body: Record<string, unknown> }, expectedCode?: string) {
  assert.ok(res.status >= 400, `Expected error status, got ${res.status}`)
  const body = res.body as { error?: { code: string; message: string } }
  assert.ok(body.error, 'Expected error object')
  if (expectedCode) assert.equal(body.error.code, expectedCode)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: gRPC pipeline (PetStore)', () => {
  before(async () => {
    grpcPort = await startGrpcServer()
    await startBackend(grpcPort)
  })

  after(async () => {
    await stopBackend()
    await stopGrpcServer()
    delete process.env.GRPC_TARGET_PORT
  })

  // ===== Service discovery ================================================

  describe('discovery', () => {
    it('discovers the PetStoreService with all methods', async () => {
      const res = await httpPost('/api/grpc/discover')
      assertSuccessEnvelope(res)

      const { services } = res.body.data as { services: Array<{ fullName: string; methods: Array<{ name: string; kind: string }> }> }
      const svc = services.find((s) => s.fullName === SERVICE)
      assert.ok(svc, `Expected ${SERVICE} in discovery`)

      const kinds = Object.fromEntries(svc.methods.map((m) => [m.name, m.kind]))
      assert.equal(kinds.GetPet, 'unary')
      assert.equal(kinds.WatchPets, 'server_streaming')
      assert.equal(kinds.BulkCreatePets, 'client_streaming')
      assert.equal(kinds.MonitorHealth, 'bidi_streaming')
    })
  })

  // ===== Descriptor set ===================================================

  describe('descriptor-set', () => {
    it('returns valid base64 FileDescriptorSet', async () => {
      const res = await httpPost('/api/grpc/descriptor-set', { messageType: 'petstore.v1.Pet' })
      assertSuccessEnvelope(res)

      const { messageType, descriptorSetBase64 } = res.body.data as { messageType: string; descriptorSetBase64: string }
      assert.equal(messageType, 'petstore.v1.Pet')
      assert.ok(Buffer.from(descriptorSetBase64, 'base64').length > 0)
    })

    it('rejects unknown message types', async () => {
      const res = await httpPost('/api/grpc/descriptor-set', { messageType: 'nonexistent.Type' })
      assert.ok(res.status >= 400)
    })
  })

  // ===== Status ===========================================================

  describe('status', () => {
    it('reports connected with correct target port', async () => {
      const res = await httpGet('/api/grpc/status')
      assertSuccessEnvelope(res)

      const data = res.body.data as { connected: boolean; targetServer: string; servicesCount: number }
      assert.equal(data.connected, true)
      assert.ok(data.targetServer.includes(String(grpcPort)))
      assert.ok(data.servicesCount > 0)
    })
  })

  // ===== 1. Unary RPC (HTTP) =============================================

  describe('unary RPC', () => {
    it('ListPets returns seeded data', async () => {
      const res = await invokeUnary('ListPets', { page_size: 10 })
      assertSuccessEnvelope(res)

      const inner = (res.body.data as { success: boolean; data: { pets: unknown[]; total_count: number } })
      assert.equal(inner.success, true)
      assert.ok(inner.data.pets.length > 0)
      assert.ok(inner.data.total_count > 0)
    })

    it('GetPet returns a specific seeded pet', async () => {
      const res = await invokeUnary('GetPet', { id: 'pet-001' })
      assertSuccessEnvelope(res)

      const inner = (res.body.data as { success: boolean; data: { name: string; species: string } })
      assert.equal(inner.success, true)
      assert.equal(inner.data.name, 'Luna')
      assert.equal(inner.data.species, 'SPECIES_DOG')
    })

    it('CreatePet returns the created pet with an id', async () => {
      const res = await invokeUnary('CreatePet', {
        pet: { name: 'IntegrationCat', species: 'SPECIES_CAT', breed: 'Siamese' },
      })
      assertSuccessEnvelope(res)

      const inner = (res.body.data as { success: boolean; data: { id: string; name: string } })
      assert.equal(inner.success, true)
      assert.equal(inner.data.name, 'IntegrationCat')
      assert.ok(inner.data.id)
    })

    it('SearchPets filters by query', async () => {
      const res = await invokeUnary('SearchPets', { query: 'Luna' })
      assertSuccessEnvelope(res)

      const inner = (res.body.data as { success: boolean; data: { pets: Array<{ name: string }> } })
      assert.equal(inner.success, true)
      assert.ok(inner.data.pets.some((p) => p.name === 'Luna'))
    })

    describe('error paths', () => {
      it('returns METHOD_ERROR for gRPC NOT_FOUND', async () => {
        const res = await invokeUnary('GetPet', { id: 'does-not-exist' })
        assertErrorResponse(res, 'METHOD_ERROR')
        assert.ok((res.body.error as { message: string }).message.includes('not found'))
      })

      it('rejects streaming methodKind with 400', async () => {
        const res = await httpPost('/api/grpc/invoke', {
          service: SERVICE, method: 'WatchPets', methodKind: 'server_streaming', data: {},
        })
        assert.equal(res.status, 400)
      })

      it('rejects missing fields with validation error', async () => {
        const res = await httpPost('/api/grpc/invoke', {})
        assertErrorResponse(res, 'VALIDATION_ERROR')
      })
    })
  })

  // ===== 2. Server streaming (WebSocket) ==================================

  describe('server streaming RPC', () => {
    it('WatchPets receives events then completes on cancel', async () => {
      const ws = await openWs()
      try {
        wsSend(ws, {
          type: 'start',
          payload: { service: SERVICE, method: 'WatchPets', methodKind: 'server_streaming', data: {} },
        })

        // Collect at least one response frame, then cancel
        const firstBatch = await collectFrames(ws, (frames) =>
          frames.some((f) => f.type === 'response'),
        )
        assert.ok(firstBatch.some((f) => f.type === 'response'), 'Expected at least one response event')

        wsSend(ws, { type: 'cancel' })
      } finally {
        ws.close()
      }
    })

    it('returns error for non-existent method', async () => {
      const frames = await streamRpc({
        method: 'NonExistent',
        methodKind: 'server_streaming',
        data: {},
      })
      assert.ok(frames.some((f) => f.type === 'error'), 'Expected error frame for bad method')
    })
  })

  // ===== 3. Client streaming (WebSocket) ==================================

  describe('client streaming RPC', () => {
    it('BulkCreatePets accepts streamed pets and returns count', async () => {
      const frames = await streamRpc({
        method: 'BulkCreatePets',
        methodKind: 'client_streaming',
        clientMessages: [
          { type: 'data', payload: { pet: { name: 'Bulk1', species: 'SPECIES_DOG' } } },
          { type: 'data', payload: { pet: { name: 'Bulk2', species: 'SPECIES_CAT' } } },
          { type: 'data', payload: { pet: { name: 'Bulk3', species: 'SPECIES_BIRD' } } },
          { type: 'end' },
        ],
      })

      const responseFrame = frames.find((f) => f.type === 'response')
      assert.ok(responseFrame, 'Expected response frame')

      const data = responseFrame.data as { created_count: number; ids: string[] }
      assert.equal(data.created_count, 3)
      assert.equal(data.ids.length, 3)
      assert.ok(frames.some((f) => f.type === 'complete'))
    })

    it('BulkCreatePets skips invalid entries gracefully', async () => {
      const frames = await streamRpc({
        method: 'BulkCreatePets',
        methodKind: 'client_streaming',
        clientMessages: [
          { type: 'data', payload: { pet: { name: 'Valid', species: 'SPECIES_DOG' } } },
          { type: 'data', payload: { pet: {} } },  // missing name
          { type: 'end' },
        ],
      })

      const responseFrame = frames.find((f) => f.type === 'response')
      assert.ok(responseFrame, 'Expected response frame')

      const data = responseFrame.data as { created_count: number; errors: string[] }
      assert.equal(data.created_count, 1)
      assert.ok(data.errors.length > 0, 'Expected error entries for invalid pets')
    })
  })

  // ===== 4. Bidirectional streaming (WebSocket) ===========================

  describe('bidi streaming RPC', () => {
    it('MonitorHealth echoes health checks for known pets', async () => {
      const frames = await streamRpc({
        method: 'MonitorHealth',
        methodKind: 'bidi_streaming',
        clientMessages: [
          { type: 'data', payload: { pet_id: 'pet-001', vital_signs: ['heart_rate'] } },
          { type: 'data', payload: { pet_id: 'pet-001', vital_signs: ['temperature'] } },
          { type: 'end' },
        ],
      })

      const responses = frames.filter((f) => f.type === 'response')
      assert.equal(responses.length, 2, 'Expected one response per request')

      for (const resp of responses) {
        const data = resp.data as { pet_id: string; is_healthy: boolean; vitals: Record<string, number> }
        assert.equal(data.pet_id, 'pet-001')
        assert.equal(data.is_healthy, true)
        assert.ok(Object.keys(data.vitals).length > 0, 'Expected vitals')
      }

      assert.ok(frames.some((f) => f.type === 'complete'))
    })

    it('MonitorHealth returns unhealthy for unknown pet', async () => {
      const frames = await streamRpc({
        method: 'MonitorHealth',
        methodKind: 'bidi_streaming',
        clientMessages: [
          { type: 'data', payload: { pet_id: 'ghost-pet', vital_signs: [] } },
          { type: 'end' },
        ],
      })

      const resp = frames.find((f) => f.type === 'response')
      assert.ok(resp, 'Expected response frame')

      const data = resp.data as { pet_id: string; is_healthy: boolean }
      assert.equal(data.pet_id, 'ghost-pet')
      assert.equal(data.is_healthy, false)
    })
  })

  // ===== WebSocket protocol edge cases ====================================

  describe('WebSocket protocol', () => {
    it('ping → pong', async () => {
      const ws = await openWs()
      try {
        wsSend(ws, { type: 'ping' })
        const frames = await collectFrames(ws, (f) => f.some((fr) => fr.type === 'pong'))
        assert.ok(frames.some((f) => f.type === 'pong'))
      } finally {
        ws.close()
      }
    })

    it('returns error for invalid JSON', async () => {
      const ws = await openWs()
      try {
        ws.send('not valid json {{{')
        const frames = await collectFrames(ws, (f) => f.some((fr) => fr.type === 'error'))
        assert.ok(frames.some((f) => f.type === 'error'))
      } finally {
        ws.close()
      }
    })

    it('returns error for unknown message type', async () => {
      const ws = await openWs()
      try {
        wsSend(ws, { type: 'bogus' })
        const frames = await collectFrames(ws, (f) => f.some((fr) => fr.type === 'error'))
        assert.ok(frames.some((f) => f.type === 'error'))
      } finally {
        ws.close()
      }
    })
  })

  // ===== End-to-end pipeline ==============================================

  describe('full pipeline: discover → descriptor → invoke', () => {
    it('discovers, fetches descriptors, then invokes ListPets', async () => {
      // 1. Discover
      const discoverRes = await httpPost('/api/grpc/discover')
      assertSuccessEnvelope(discoverRes)

      const svc = (discoverRes.body.data as { services: Array<{ fullName: string; methods: Array<{ name: string; inputType: string }> }> })
        .services.find((s) => s.fullName === SERVICE)!
      const listMethod = svc.methods.find((m) => m.name === 'ListPets')!

      // 2. Descriptor
      const descRes = await httpPost('/api/grpc/descriptor-set', { messageType: listMethod.inputType })
      assertSuccessEnvelope(descRes)
      assert.ok((descRes.body.data as { descriptorSetBase64: string }).descriptorSetBase64.length > 0)

      // 3. Invoke
      const invokeRes = await invokeUnary('ListPets', { page_size: 5 })
      assertSuccessEnvelope(invokeRes)

      const inner = (invokeRes.body.data as { success: boolean; data: { pets: unknown[] } })
      assert.equal(inner.success, true)
      assert.ok(inner.data.pets.length > 0)
    })
  })
})
