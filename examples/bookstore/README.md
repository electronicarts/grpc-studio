# Example: BookStore gRPC Service

A demo gRPC server with deeply nested protobuf types for testing gRPC Studio.
It mirrors the [PetStore](../petstore/) example with a bookstore domain, so you
can run two distinct reflection-enabled services side by side.

## What's Inside

The BookStore service exercises every proto3 feature gRPC Studio supports:

| Feature | Where |
|---------|-------|
| Deep nesting (3 levels) | `Book` → `Publisher` → `Address` → `Coordinates` |
| Recursive (direct) | `Book.prequel` — a `Book` inside a `Book` |
| Recursive (repeated) | `Book.sequels` — `repeated Book` |
| Recursive (indirect) | `Book.lineage` → `BookLineage.predecessor` → `Book`, plus `BookLineage.branches` |
| Enums | `Genre`, `Availability` |
| Repeated scalar | `alternate_titles` |
| Repeated message | `reviews`, `editions` |
| Map\<string, string\> | `tags` |
| Map\<string, message\> | `editions_by_format` |
| OneOf | `CatalogEntry.identifier` (ISBN-13 / ISBN-10 / SKU / series) |
| Timestamp | `created_at`, `updated_at`, review/edition dates |
| Duration | `Edition.time_in_print` |
| Wrapper types | `StringValue`, `Int32Value`, `FloatValue`, `DoubleValue`, `BoolValue` |
| Bytes | `cover_thumbnail` |
| Struct | `metadata` (arbitrary JSON-like data) |
| Empty | `DeleteBook` response |
| Server streaming | `WatchBooks` — live catalog event feed every 2s |
| Client streaming | `BulkCreateBooks` — bulk upload |
| Bidi streaming | `CheckStock` — request stock, get warehouse quantities |

## Quick Start

```bash
cd examples/bookstore
npm install
npm start
```

The server starts on `localhost:50052` (override with `PORT=6566 npm start`).

If you edit `proto/bookstore.proto`, regenerate the descriptor:

```bash
npm run proto:generate
```

This requires `protoc` installed (`brew install protobuf`).

## Connect gRPC Studio

1. Add a target with `host: localhost` and `port: 50052` under `client.targets` in `config/backend.yaml`
2. Start gRPC Studio (`npm run dev` from the repo root)
3. The BookStore service appears automatically via reflection

To run both example services together, use `npm run dev:all` from the repo root —
it starts the frontend, backend, PetStore (`:50051`), and BookStore (`:50052`).

## Seed Data

The server starts with 3 pre-loaded books:

| ID | Title | Genre | Availability | Highlights |
|----|-------|-------|--------------|------------|
| book-001 | Harry Potter and the Philosopher's Stone | Fantasy | In stock | Full publisher, reviews, editions, map tags, struct metadata, **recursive relatives** |
| book-002 | The Hobbit | Fantasy | Preorder | Series info (oneOf), alternate titles, formats in metadata |
| book-003 | Goodnight Moon | Children | In stock | Internal SKU (oneOf), no publisher, minimal records |

book-001 carries all three cycle shapes: a `prequel` (Fantastic Beasts), two
`sequels` (Chamber of Secrets, Goblet of Fire — Chamber of Secrets in turn has
its own `sequels`, so the payload is three `Book` levels deep), and a `lineage`
chain with recursive `branches`. The related volumes are reachable only through
those fields; they are not separate `ListBooks` records.

## RPCs to Try

- **ListBooks** — returns all books, supports `genre_filter` and `availability_filter`
- **GetBook** — `{ "id": "book-001" }` to see the Philosopher's Stone with all nested types
- **CreateBook** — create a new book with any combination of fields
- **SearchBooks** — text search with `query`, filter by `genres` array, `max_page_count`, `max_price_usd`
- **GetBookSeries** — `{ "id": "book-001", "depth": 4 }` returns a `Book` whose
  `prequel`, `sequels` and `lineage` nest to the requested depth. Use this to
  stress a renderer against a cyclic schema; `depth` is capped at 10
- **WatchBooks** — server stream that emits random catalog events every 2 seconds
- **BulkCreateBooks** — send multiple books as a client stream
- **CheckStock** — send `{ "book_id": "book-001", "warehouses": ["east", "west"] }` and get quantities back
