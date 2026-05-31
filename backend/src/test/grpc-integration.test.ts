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

    it('CreatePet round-trips wrapper type fields as raw scalars', async () => {
      // Wrapper fields (google.protobuf.StringValue, Int32Value) must be sent as
      // raw JSON scalars, not as { value: X } objects.  This mirrors what the
      // fixed WrapperField component emits after user input.
      const res = await invokeUnary('CreatePet', {
        pet: {
          name: 'WrapperPet',
          species: 'SPECIES_DOG',
          description: 'A dog with wrapper fields',
          microchip_frequency: 134200,
        },
      })
      assertSuccessEnvelope(res)

      type PetData = { id: string; name: string; description: string; microchip_frequency: number }
      const inner = res.body.data as { success: boolean; data: PetData }
      assert.equal(inner.success, true)
      assert.equal(inner.data.name, 'WrapperPet')
      // Response wrapper fields must also arrive as raw scalars (toJson well-known encoding)
      assert.equal(inner.data.description, 'A dog with wrapper fields')
      assert.equal(inner.data.microchip_frequency, 134200)
    })

    it('CreatePet round-trips Duration field (recovery_time) as a proto JSON string', async () => {
      // Duration must be sent as "Xs" string — NOT as { seconds: X }.
      // The DurationField renderer keeps it as a string; this test verifies
      // the full stack: string → fromJson → gRPC binary → server → toJson → string.
      const res = await invokeUnary('CreatePet', {
        pet: {
          name: 'DurationPet',
          species: 'SPECIES_DOG',
          medical_history: [
            {
              diagnosis: 'Test condition',
              treatment: 'Rest',
              recovery_time: '864000s',   // 10 days in seconds
              follow_up_required: false,
            },
          ],
        },
      })
      assertSuccessEnvelope(res)

      type MedRecord = { diagnosis: string; recovery_time: string }
      type PetData  = { name: string; medical_history: MedRecord[] }
      const inner = res.body.data as { success: boolean; data: PetData }
      assert.equal(inner.success, true)
      assert.equal(inner.data.name, 'DurationPet')
      // toJson re-encodes Duration as the canonical string form
      assert.equal(inner.data.medical_history[0].recovery_time, '864000s')
    })

    it('CreatePet round-trips every field type in the Pet message', async () => {
      // Sends one CreatePet request with every field populated and asserts
      // each field in the response — covering all proto3 field types:
      // scalars, enums, bytes, nested messages (3 levels), Timestamp, Duration,
      // StringValue / Int32Value / FloatValue wrappers, oneof, repeated scalar,
      // repeated message, map<string,string>, map<string,message>, and Struct.
      const res = await invokeUnary('CreatePet', {
        pet: {
          // ── Scalars ──────────────────────────────────────────────────────
          name:    'AllFieldsPet',
          breed:   'Border Collie',
          age_months: 24,
          weight_kg:  18.5,
          is_neutered: true,
          photo_thumbnail: 'aGVsbG8=',   // base64("hello")

          // ── Enums ────────────────────────────────────────────────────────
          species: 'SPECIES_DOG',
          status:  'STATUS_AVAILABLE',

          // ── Wrapper types (sent as raw scalars, not { value: X }) ────────
          description:        'A clever dog',
          microchip_frequency: 134200,

          // ── Nested message (3 levels: Owner → Address → Coordinates) ────
          owner: {
            id:    'owner-allfields',
            name:  'Test Owner',
            email: 'allfields@example.com',
            phone: '+1-555-0000',
            address: {
              street:   '1 Test Street',
              city:     'Testville',
              state:    'CA',
              zip_code: '90210',
              country:  'US',
              coordinates: { latitude: 34.0522, longitude: -118.2437 },
            },
            registered_at: '2024-01-01T00:00:00Z',   // Timestamp
          },

          // ── OneOf (scalar branch: microchip_id) ──────────────────────────
          identification: { microchip_id: 'CHIP-ALLFIELDS' },

          // ── Repeated scalar ───────────────────────────────────────────────
          nicknames: ['Spot', 'Buddy'],

          // ── Repeated message: Vaccination (Timestamp + StringValue) ───────
          vaccinations: [
            {
              name:           'Rabies',
              administered_at: '2024-06-01T09:00:00Z',
              expires_at:      '2025-06-01T09:00:00Z',
              veterinarian:    'Dr. Test',
              batch_number:    'BATCH-001',   // StringValue as raw string
            },
          ],

          // ── Repeated message: MedicalRecord (Timestamp + Duration + FloatValue) ──
          medical_history: [
            {
              id:          'med-allfields',
              diagnosis:   'Annual checkup',
              treatment:   'Routine exam',
              date:        '2024-03-15T10:00:00Z',
              recovery_time: '86400s',    // Duration: 1 day as proto JSON string
              cost:          150.0,       // FloatValue as raw number
              follow_up_required: false,
            },
          ],

          // ── Map<string, string> ───────────────────────────────────────────
          tags: { color: 'black-white', size: 'large' },

          // ── Map<string, MedicalRecord> ────────────────────────────────────
          records_by_vet: {
            'dr-allfields': {
              id:          'rec-allfields',
              diagnosis:   'Healthy',
              treatment:   'Vaccines',
              date:        '2024-06-01T09:00:00Z',
              recovery_time: '3600s',     // Duration: 1 hour
              cost:          200.0,
              follow_up_required: false,
            },
          },

          // ── Struct (arbitrary JSON object) ────────────────────────────────
          metadata: { source: 'allfields-test', priority: 1, verified: true },
        },
      })

      assertSuccessEnvelope(res)

      type Coords  = { latitude: number; longitude: number }
      type Address = { street: string; city: string; state: string; zip_code: string; country: string; coordinates: Coords }
      type Owner   = { id: string; name: string; email: string; phone: string; address: Address; registered_at: string }
      type Vax     = { name: string; administered_at: string; expires_at: string; veterinarian: string; batch_number: string }
      type MedRec  = { id: string; diagnosis: string; treatment: string; date: string; recovery_time: string; cost: number; follow_up_required: boolean }
      type Ident   = { microchip_id?: string }
      type Pet = {
        id: string; name: string; breed: string; age_months: number; weight_kg: number
        is_neutered: boolean; photo_thumbnail: string
        species: string; status: string
        description: string; microchip_frequency: number
        owner: Owner
        identification: Ident
        nicknames: string[]
        vaccinations: Vax[]
        medical_history: MedRec[]
        tags: Record<string, string>
        records_by_vet: Record<string, MedRec>
        metadata: Record<string, unknown>
        created_at: string; updated_at: string
      }
      const { data: pet } = (res.body.data as { success: boolean; data: Pet })

      // Scalars
      assert.equal(pet.name,         'AllFieldsPet')
      assert.equal(pet.breed,        'Border Collie')
      assert.equal(pet.age_months,   24)
      assert.equal(pet.weight_kg,    18.5)
      assert.equal(pet.is_neutered,  true)
      assert.ok(pet.id, 'id must be set by server')

      // Bytes — base64 round-trip
      assert.equal(pet.photo_thumbnail, 'aGVsbG8=')

      // Enums
      assert.equal(pet.species, 'SPECIES_DOG')
      assert.equal(pet.status,  'STATUS_AVAILABLE')

      // Wrapper types — raw scalars, not { value: X }
      assert.equal(pet.description,         'A clever dog')
      assert.equal(typeof pet.description,  'string')
      assert.equal(pet.microchip_frequency, 134200)
      assert.equal(typeof pet.microchip_frequency, 'number')

      // Timestamps — server always overwrites created_at / updated_at
      assert.equal(typeof pet.created_at, 'string')
      assert.equal(typeof pet.updated_at, 'string')

      // Nested message: owner (level 1)
      assert.equal(pet.owner.name,  'Test Owner')
      assert.equal(pet.owner.email, 'allfields@example.com')
      assert.equal(pet.owner.phone, '+1-555-0000')
      // Nested message: owner.address (level 2)
      assert.equal(pet.owner.address.street,   '1 Test Street')
      assert.equal(pet.owner.address.city,     'Testville')
      assert.equal(pet.owner.address.state,    'CA')
      assert.equal(pet.owner.address.zip_code, '90210')
      assert.equal(pet.owner.address.country,  'US')
      // Nested message: owner.address.coordinates (level 3)
      assert.equal(pet.owner.address.coordinates.latitude,  34.0522)
      assert.equal(pet.owner.address.coordinates.longitude, -118.2437)
      // Timestamp in nested message
      assert.ok(typeof pet.owner.registered_at === 'string')
      assert.ok(pet.owner.registered_at.includes('2024-01-01'))

      // OneOf: scalar branch
      assert.equal(pet.identification.microchip_id, 'CHIP-ALLFIELDS')

      // Repeated scalar
      assert.deepEqual(pet.nicknames, ['Spot', 'Buddy'])

      // Repeated message: Vaccination
      assert.equal(pet.vaccinations.length, 1)
      const vax = pet.vaccinations[0]
      assert.equal(vax.name,        'Rabies')
      assert.equal(vax.veterinarian, 'Dr. Test')
      assert.ok(typeof vax.administered_at === 'string')
      assert.ok(vax.administered_at.includes('2024-06-01'))
      assert.ok(typeof vax.expires_at === 'string')
      assert.ok(vax.expires_at.includes('2025-06-01'))
      // StringValue wrapper in repeated message
      assert.equal(vax.batch_number,        'BATCH-001')
      assert.equal(typeof vax.batch_number, 'string')

      // Repeated message: MedicalRecord
      assert.equal(pet.medical_history.length, 1)
      const med = pet.medical_history[0]
      assert.equal(med.id,        'med-allfields')
      assert.equal(med.diagnosis, 'Annual checkup')
      assert.equal(med.treatment, 'Routine exam')
      assert.equal(med.follow_up_required, false)
      // Timestamp in repeated message
      assert.ok(typeof med.date === 'string')
      assert.ok(med.date.includes('2024-03-15'))
      // Duration — must come back as proto JSON string, not object
      assert.equal(med.recovery_time,        '86400s')
      assert.equal(typeof med.recovery_time, 'string')
      // FloatValue — raw number
      assert.ok(Math.abs(med.cost - 150.0) < 0.01)
      assert.equal(typeof med.cost, 'number')

      // Map<string, string>
      assert.equal(pet.tags.color, 'black-white')
      assert.equal(pet.tags.size,  'large')

      // Map<string, MedicalRecord>
      const vetRec = pet.records_by_vet['dr-allfields']
      assert.ok(vetRec, 'records_by_vet["dr-allfields"] must exist')
      assert.equal(vetRec.diagnosis, 'Healthy')
      assert.ok(typeof vetRec.date === 'string')
      assert.ok(vetRec.date.includes('2024-06-01'))
      // Duration in map value
      assert.equal(vetRec.recovery_time,        '3600s')
      assert.equal(typeof vetRec.recovery_time, 'string')
      // FloatValue in map value
      assert.ok(Math.abs(vetRec.cost - 200.0) < 0.01)

      // Struct
      assert.equal(pet.metadata.source,   'allfields-test')
      assert.equal(pet.metadata.priority, 1)
      assert.equal(pet.metadata.verified, true)
    })

    it('CreatePet round-trips oneOf message branch (identification.collar)', async () => {
      // The Identification message has a oneof with both scalar branches
      // (microchip_id, tattoo_code, tag_number) and one message branch (collar:
      // CollarInfo). The all-fields test only exercises microchip_id (scalar).
      // This test covers the message branch end-to-end.
      const res = await invokeUnary('CreatePet', {
        pet: {
          name: 'CollarPet',
          species: 'SPECIES_CAT',
          identification: {
            collar: {
              color:    'red',
              material: 'nylon',
              has_gps:  true,
            },
          },
        },
      })
      assertSuccessEnvelope(res)

      type CollarInfo  = { color: string; material: string; has_gps: boolean }
      type Ident       = { collar?: CollarInfo }
      type PetData     = { name: string; identification: Ident }
      const inner = res.body.data as { success: boolean; data: PetData }
      assert.equal(inner.success, true)
      assert.equal(inner.data.name, 'CollarPet')

      const collar = inner.data.identification.collar
      assert.ok(collar, 'identification.collar must be present')
      assert.equal(collar.color,    'red')
      assert.equal(collar.material, 'nylon')
      assert.equal(collar.has_gps,  true)
    })

    it('SearchPets filters by wrapper type max_age_months (raw scalar)', async () => {
      // SearchPetsRequest.max_age_months is an Int32Value — must be sent as a raw number.
      const res = await invokeUnary('SearchPets', { query: '', max_age_months: 24 })
      assertSuccessEnvelope(res)

      type ListData = { pets: Array<{ age_months: number }> }
      const inner = res.body.data as { success: boolean; data: ListData }
      assert.equal(inner.success, true)
      // Every returned pet must be within the age filter
      for (const pet of inner.data.pets) {
        assert.ok(pet.age_months <= 24, `Pet age ${pet.age_months} exceeds max_age_months: 24`)
      }
    })

    it('SearchPets filters by query', async () => {
      const res = await invokeUnary('SearchPets', { query: 'Luna' })
      assertSuccessEnvelope(res)

      const inner = (res.body.data as { success: boolean; data: { pets: Array<{ name: string }> } })
      assert.equal(inner.success, true)
      assert.ok(inner.data.pets.some((p) => p.name === 'Luna'))
    })

    it('UpdatePet with FieldMask only updates the masked fields', async () => {
      // First create a pet we can safely mutate without affecting other tests
      const createRes = await invokeUnary('CreatePet', {
        pet: { name: 'MaskTestPet', species: 'SPECIES_CAT', breed: 'Siamese', age_months: 12 },
      })
      assertSuccessEnvelope(createRes)
      const petId = ((createRes.body.data as { success: boolean; data: { id: string } }).data).id

      // Update only name and age_months via FieldMask (lowerCamelCase paths)
      const updateRes = await invokeUnary('UpdatePet', {
        pet: { id: petId, name: 'MaskTestPet-Renamed', breed: 'Persian', age_months: 24 },
        update_mask: 'name,ageMonths',   // FieldMask as lowerCamelCase string
      })
      assertSuccessEnvelope(updateRes)

      type PetData = { id: string; name: string; breed: string; age_months: number }
      const inner = updateRes.body.data as { success: boolean; data: PetData }
      assert.equal(inner.success, true)
      // Masked fields are updated
      assert.equal(inner.data.name,       'MaskTestPet-Renamed')
      assert.equal(inner.data.age_months, 24)
      // Non-masked field is unchanged (breed was not in the mask)
      assert.equal(inner.data.breed, 'Siamese')
    })

    it('CreatePet and GetPet round-trip google.protobuf.Any field (extra_info)', async () => {
      // Any containing a StringValue — a well-known type in the backend registry
      const createRes = await invokeUnary('CreatePet', {
        pet: {
          name: 'AnyPet',
          species: 'SPECIES_DOG',
          extra_info: {
            '@type': 'type.googleapis.com/google.protobuf.StringValue',
            'value': 'some-extra-data',
          },
        },
      })
      assertSuccessEnvelope(createRes)

      type PetData = { id: string; name: string; extra_info: Record<string, unknown> }
      const createInner = createRes.body.data as { success: boolean; data: PetData }
      assert.equal(createInner.success, true)
      const petId = createInner.data.id

      // extra_info must come back as a JSON object with @type preserved
      const ei = createInner.data.extra_info
      assert.ok(ei, 'extra_info must be present in CreatePet response')
      assert.equal(ei['@type'], 'type.googleapis.com/google.protobuf.StringValue')
      assert.equal(ei['value'], 'some-extra-data')

      // Fetch the pet and verify extra_info survives a round-trip through the store
      const getRes = await invokeUnary('GetPet', { id: petId })
      assertSuccessEnvelope(getRes)

      const getInner = getRes.body.data as { success: boolean; data: PetData }
      const storedEi = getInner.data.extra_info
      assert.ok(storedEi, 'extra_info must be present in GetPet response')
      assert.equal(storedEi['@type'], 'type.googleapis.com/google.protobuf.StringValue')
      assert.equal(storedEi['value'], 'some-extra-data')
    })

    it('CreatePet round-trips google.protobuf.Any with custom reflected type (Owner)', async () => {
      // Any containing a petstore.v1.Owner — a custom type from reflection (not WKT).
      // This test verifies the dynamic registry correctly includes reflected types,
      // allowing fromJson/toJson to encode/decode custom message types in Any fields.
      const createRes = await invokeUnary('CreatePet', {
        pet: {
          name: 'CustomAnyPet',
          species: 'SPECIES_CAT',
          extra_info: {
            '@type': 'type.googleapis.com/petstore.v1.Owner',
            'id': 'owner-custom',
            'name': 'Jane Smith',
            'email': 'jane@example.com',
            'phone': '+1-555-1234',
          },
        },
      })
      assertSuccessEnvelope(createRes)

      type OwnerInAny = { '@type': string; id: string; name: string; email: string; phone: string }
      type PetData = { id: string; name: string; extra_info: OwnerInAny }
      const createInner = createRes.body.data as { success: boolean; data: PetData }
      assert.equal(createInner.success, true)

      // extra_info must come back with @type preserved and all Owner fields intact
      const ei = createInner.data.extra_info
      assert.ok(ei, 'extra_info must be present')
      assert.equal(ei['@type'], 'type.googleapis.com/petstore.v1.Owner')
      assert.equal(ei['id'], 'owner-custom')
      assert.equal(ei['name'], 'Jane Smith')
      assert.equal(ei['email'], 'jane@example.com')
      assert.equal(ei['phone'], '+1-555-1234')
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
