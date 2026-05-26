# gRPC Studio Frontend

The frontend is a React/Vite UI for reflection-based gRPC exploration. It reads discovered services from the backend, fetches protobuf descriptor sets on demand, renders request/response forms from Buf descriptors, and controls streaming calls over WebSocket.

## Run

```bash
npm install
npm run dev
npm run build
npm run test:run
```

The dev server expects the backend URL from runtime config, usually `frontend/public/config/frontend.yaml`.

## Data Flow

Initial load:

```
useSchemaLoader()
  -> POST /api/grpc/discover
  -> schemaCache.setServices(GrpcService[])
  -> serviceExplorer renders service/method tree
```

Method selection:

```
useRequestModel()
  -> schemaCache.getSchema(inputType)
  -> POST /api/grpc/descriptor-set when not cached
  -> parse base64 FileDescriptorSet with @bufbuild/protobuf
  -> SchemaRenderer receives DescMessage
```

Invocation:

```
toWireFormat()
  -> @bufbuild/protobuf fromJson()
  -> @bufbuild/protobuf toJson({ useProtoFieldName: true })
  -> HTTP unary or WebSocket streaming
```

Responses:

```
backend returns proto JSON using proto field names
  -> toDisplayFormat()
  -> response schema fetched by outputType
  -> JSON/Form/Schema tabs render from one response model
```

## Key Files

```
src/pages/Playground.tsx                         main workbench layout
src/features/schemaLoader/lib/schemaCache.ts     service + descriptor cache
src/features/schemaLoader/lib/descriptorSetFetcher.ts /api/grpc/descriptor-set fetch
src/features/serviceExplorer/                    service/method selection
src/features/methodExplorer/                     request, invocation, response UI
src/features/methodExplorer/utils/payload.ts     Buf-backed request/response JSON boundary
src/features/schemaRenderer/                     recursive DescMessage form renderer
src/features/certificateValidator/               mTLS certificate status UI
src/lib/http/apiClient.ts                        HTTP client with retry/timeout/error parsing
src/types/grpc.ts                                shared API contract type aliases
```

## Feature Notes

### schemaLoader

Stores discovered services in memory and localStorage. Message schemas are not embedded in discovery responses; they are fetched lazily as base64 `FileDescriptorSet` binaries and parsed into `DescMessage` objects.

### schemaRenderer

Renders directly from `@bufbuild/protobuf` descriptor objects:

- scalar inputs
- enums
- nested messages
- repeated fields
- maps
- oneof groups
- timestamps and wrapper messages
- read-only response forms with empty-field hiding

### methodExplorer

Owns the RPC workflow:

- `useRequestModel` tracks form/JSON request state
- `useMethodInvocation` prepares requests and routes unary vs streaming
- `useGrpcWebSocket` manages `/ws/grpc`, heartbeat, and reconnects
- `ExecutionControls` sends unary calls and streaming control messages
- `responseHandlerUtils` canonicalizes responses and applies output schemas
- `useHistoryModel` records request history and reloads previous payloads

Streaming uses a consistent layout after the first sent message: sent messages on the left, received messages on the right.

## Request Normalization

`payload.ts` is the compatibility boundary between UI state and protobuf JSON. It delegates schema-aware validation and canonicalization to `@bufbuild/protobuf`:

- `fromJson()` validates request JSON against the selected input descriptor
- `toJson({ useProtoFieldName: true })` produces the payload sent to the backend
- well-known types such as Struct, Value, ListValue, Timestamp, wrappers, and maps use Buf's protobuf JSON rules
- bytes remain protobuf JSON base64 strings

The backend still runs its own `fromJson()` before encoding real gRPC bytes; frontend validation is for user feedback, while the backend remains the transport boundary.

## Cache

`schemaCache` keeps:

- discovered `GrpcService[]`
- loaded `DescMessage` objects by type name
- in-flight schema promises to dedupe concurrent loads

Only services are persisted to localStorage. Descriptor objects are rebuilt on demand after refresh because they are runtime objects, not plain JSON.

## Checks

```bash
npm run build
npm run test:run
```
