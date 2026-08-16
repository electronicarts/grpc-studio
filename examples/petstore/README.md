# Example: PetStore gRPC Service

A demo gRPC server with deeply nested protobuf types for testing gRPC Studio.

## What's Inside

The PetStore service exercises every proto3 feature gRPC Studio supports:

| Feature | Where |
|---------|-------|
| Deep nesting (3 levels) | `Pet` → `Owner` → `Address` → `Coordinates` |
| Recursive (direct) | `Pet.parent` — a `Pet` inside a `Pet` |
| Recursive (repeated) | `Pet.offspring` — `repeated Pet` |
| Recursive (indirect) | `Pet.lineage` → `PetLineage.ancestor` → `Pet`, plus `PetLineage.branches` |
| Enums | `Species`, `Status` |
| Repeated scalar | `nicknames` |
| Repeated message | `vaccinations`, `medical_history` |
| Map\<string, string\> | `tags` |
| Map\<string, message\> | `records_by_vet` |
| OneOf | `Identification.method` (microchip / tattoo / tag / collar) |
| Timestamp | `created_at`, `updated_at`, vaccination dates |
| Duration | `MedicalRecord.recovery_time` |
| Wrapper types | `StringValue`, `Int32Value`, `FloatValue`, `DoubleValue` |
| Bytes | `photo_thumbnail` |
| Struct | `metadata` (arbitrary JSON-like data) |
| Empty | `DeletePet` response |
| Server streaming | `WatchPets` — live event feed every 2s |
| Client streaming | `BulkCreatePets` — bulk upload |
| Bidi streaming | `MonitorHealth` — request vitals, get responses |

## Quick Start

```bash
cd example
npm install
npm start
```

The server starts on `localhost:50051` (override with `PORT=6565 npm start`).

If you edit `proto/petstore.proto`, regenerate the descriptor:

```bash
npm run proto:generate
```

This requires `protoc` installed (`brew install protobuf`).

## Connect gRPC Studio

1. Set `client.target.host: localhost` and `client.target.port: 50051` in `config/backend.yaml`
2. Start gRPC Studio (`npm run dev` from the repo root)
3. The PetStore service appears automatically via reflection

## Seed Data

The server starts with 3 pre-loaded pets:

| ID | Name | Species | Status | Highlights |
|----|------|---------|--------|------------|
| pet-001 | Luna | Dog (Golden Retriever) | Available | Full owner, vaccinations, medical history, map tags, struct metadata, **recursive relatives** |
| pet-002 | Mochi | Cat (Scottish Fold) | Pending | Collar with GPS (oneOf), dietary restrictions in metadata, empty lineage |
| pet-003 | Kiwi | Bird (Cockatiel) | Available | Tag number (oneOf), no owner, minimal records |

Luna carries all three cycle shapes: a `parent` (Nova), two `offspring` (Scout,
Willow — Scout in turn has its own `offspring`, so the payload is three `Pet`
levels deep), and a `lineage` chain with recursive `branches`. The relatives are
reachable only through those fields; they are not separate `ListPets` records.

## RPCs to Try

- **ListPets** — returns all pets, supports `species_filter` and `status_filter`
- **GetPet** — `{ "id": "pet-001" }` to see Luna with all nested types
- **CreatePet** — create a new pet with any combination of fields
- **SearchPets** — text search with `query`, filter by `species` array, `max_age_months`, `max_weight_kg`
- **GetPetFamily** — `{ "id": "pet-001", "depth": 4 }` returns a `Pet` whose
  `parent`, `offspring` and `lineage` nest to the requested depth. Use this to
  stress a renderer against a cyclic schema; `depth` is capped at 10
- **WatchPets** — server stream that emits random pet events every 2 seconds
- **BulkCreatePets** — send multiple pets as a client stream
- **MonitorHealth** — send `{ "pet_id": "pet-001", "vital_signs": ["heart_rate", "temperature"] }` and get vitals back
