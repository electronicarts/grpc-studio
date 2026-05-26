# gRPC Studio Backend

The backend is a Node/Express service that proxies the browser UI to a target gRPC server. It uses gRPC server reflection to discover services and fetch protobuf descriptors, then uses `@bufbuild/protobuf` for dynamic JSON/message conversion and `@connectrpc/connect-node` for invocation.

## Run

```bash
npm install
GRPC_STUDIO_CONFIG=../config/backend.yaml npm start
GRPC_STUDIO_CONFIG=../config/backend.yaml npm run dev
```

Pick a config explicitly:

```bash
GRPC_STUDIO_CONFIG=../config/backend.yaml npm start
GRPC_STUDIO_CONFIG=../config/backend-tls-example.yaml npm start
```

## Main Flow

Health checks:

```
GET /health      -> health status (app version, uptime)
GET /ready       -> readiness probe (Kubernetes)
GET /live        -> liveness probe (Kubernetes)
GET /metrics     -> Prometheus metrics endpoint
```

Discovery:

```
POST /api/grpc/discover
  -> DiscoveryService.listServices()
  -> DiscoveryService.describeService(serviceName)
  -> ReflectionSchemaRepository.getFileRegistry(serviceName)
  -> returns service names, method names, input/output types, method kind
```

Descriptor set loading:

```
POST /api/grpc/descriptor-set { messageType }
  -> DescriptorSetService.getDescriptorSetBase64(messageType)
  -> ReflectionSchemaRepository.getFileDescriptorSet(messageType)
  -> returns base64 google.protobuf.FileDescriptorSet
```

Unary invocation:

```
POST /api/grpc/invoke { service, method, data }
  -> GrpcMethodInvokerService resolves method descriptors
  -> fromJson()
  -> createClient(reflectedService, grpcTransport).method()
  -> toJson({ useProtoFieldName: true })
```

Streaming invocation:

```
WS /ws/grpc
  start  -> WebSocketConnection starts server/client/bidi stream
  data   -> ConnectInvoker encodes and writes a request message
  end    -> half-closes client/client side of bidi stream
  cancel -> cancels the active gRPC call
```

Additional endpoints:

```
GET /api/grpc/status          -> backend status and gRPC target connectivity
GET /api/grpc/config          -> public frontend config
GET /api/grpc/config/certificate -> mTLS certificate info and expiry
```

## Key Files

```
src/server/httpServer.ts         process entrypoint & HTTP server assembly
src/app.ts                       Express middleware and route setup
src/routes/grpc.ts               HTTP routes under /api/grpc
src/controllers/                 thin HTTP controllers
src/cache/                       typed TTL caches
src/grpc/reflection/             grpc-js reflection client and FileDescriptorSet fetching
src/grpc/connect/                ConnectRPC transport, dynamic clients, JSON conversion
src/services/discoveryService.ts service/method discovery cache
src/services/descriptorSetService.ts descriptor-set response builder/cache
src/services/grpcMethodInvokerService.ts dynamic unary and streaming invocation
src/websocket/websocketServer.ts WebSocket server and keepalive
src/websocket/websocketConnection.ts per-connection stream state
src/websocket/streamRequestQueue.ts client/bidi stream request queue
src/auth/authManager.ts          outbound gRPC auth plugin lifecycle
src/auth/plugins/                outbound gRPC auth metadata plugins
src/metrics/                     Prometheus registry and collectors
src/tracing/                     OpenTelemetry setup
src/config/                      YAML schemas and ConfigManager
```

## Reflection Details

`descriptorSetFromReflection.ts` is the descriptor source of truth. It asks reflection for the file containing a service or message symbol, resolves transitive imports with `file_by_filename`, topologically orders descriptors, normalizes missing `json_name` values, and builds a Buf `FileDescriptorSet`.

Both `DiscoveryService` and `DescriptorSetService` use that same descriptor builder. This keeps the backend and frontend on one descriptor model instead of maintaining a custom schema shape.

## WebSocket Protocol

Client to server:

```json
{ "type": "start", "payload": { "service": "pkg.Service", "method": "Method", "methodKind": "bidi_streaming", "data": {} } }
{ "type": "data", "payload": {} }
{ "type": "end" }
{ "type": "cancel" }
{ "type": "ping" }
```

Server to client:

```json
{ "type": "response", "data": {} }
{ "type": "error", "error": "gRPC NotFound: ..." }
{ "type": "complete" }
{ "type": "pong" }
```

`websocketConnection.ts` keeps one active stream per socket. For client and bidirectional streams, `streamRequestQueue.ts` queues `data` and `end` messages that arrive while reflection/auth setup is still starting the backend Connect call.

## Caching

Configured by `cache.reflection` in backend YAML:

- service list cache
- per-service method description cache
- per-service Buf `FileRegistry` cache
- per-message base64 descriptor-set cache
- reflection version cache for the configured target

`clearCache()` on discovery/descriptor-set services resets in-memory reflection data.

## Authentication

Only one outbound auth plugin can be enabled at a time. If exactly one plugin has `enabled: true`, that plugin is used. If no plugin is enabled, the backend uses the built-in `none` plugin and logs a warning so auth requirements are not missed silently.

## Timeouts And Lifetimes

Backend timing config uses explicit units in each key:

| Config | Meaning |
| --- | --- |
| `server.shutdownGracePeriodMs` | Time allowed for graceful shutdown before the process exits forcefully. |
| `server.http.responseTimeoutMs` | Time allowed for an Express route to produce an HTTP response. This does not cancel in-flight gRPC work. |
| `server.http.bodyLimitBytes` | Maximum JSON/form request body size. |
| `server.websocket.maxPayloadBytes` | Maximum WebSocket message size. |
| `client.rpc.unaryDeadlineMs` | gRPC deadline for unary RPCs. |
| `client.rpc.streamDeadlineMs` | gRPC deadline for server, client, and bidirectional streaming RPCs. |
| `client.reflection.deadlineMs` | gRPC deadline for server reflection requests. Must be lower than `server.http.responseTimeoutMs`. |
| `client.keepalive.pingIntervalMs` | HTTP/2 keepalive ping cadence for gRPC channels. |
| `client.keepalive.pingTimeoutMs` | Time to wait for a keepalive ping acknowledgement. |
| `cache.reflection.ttlMs` | Reflection metadata and descriptor cache TTL. |
| `server.websocket.heartbeatIntervalMs` | WebSocket ping cadence; stale sockets are terminated after a missed heartbeat check. |
| `cache.certificate.ttlMs` | TTL for cached mTLS certificate metadata. |
| `certificate.certReadTimeoutMs` | Timeout for OpenSSL certificate inspection subprocesses. |

## Config

Common environment overrides:

| Variable | Config |
| --- | --- |
| `PORT` | `server.port` |
| `HOST` | `server.host` |
| `SHUTDOWN_GRACE_PERIOD_MS` | `server.shutdownGracePeriodMs` |
| `HTTP_RESPONSE_TIMEOUT_MS` | `server.http.responseTimeoutMs` |
| `GRPC_TARGET_HOST` | `client.target.host` |
| `GRPC_TARGET_PORT` | `client.target.port` |
| `GRPC_CLIENT_MODE` | `client.mode` |
| `GRPC_UNARY_DEADLINE_MS` | `client.rpc.unaryDeadlineMs` |
| `GRPC_STREAM_DEADLINE_MS` | `client.rpc.streamDeadlineMs` |
| `GRPC_REFLECTION_DEADLINE_MS` | `client.reflection.deadlineMs` |
| `GRPC_KEEPALIVE_PING_INTERVAL_MS` | `client.keepalive.pingIntervalMs` |
| `GRPC_KEEPALIVE_PING_TIMEOUT_MS` | `client.keepalive.pingTimeoutMs` |
| `GRPC_CLIENT_CERT` | `client.security.clientCertPath` |
| `GRPC_CLIENT_KEY` | `client.security.clientKeyPath` |
| `GRPC_CA_CERT` | `client.security.caCertPath` |
| `WS_HEARTBEAT_INTERVAL_MS` | `server.websocket.heartbeatIntervalMs` |
| `WS_MAX_PAYLOAD_BYTES` | `server.websocket.maxPayloadBytes` |
| `CERT_READ_TIMEOUT_MS` | `certificate.certReadTimeoutMs` |

## Observability

Prometheus metrics are exposed at `/metrics` (enabled by default).

**Key Metrics:**
- `grpc_studio_http_requests_total` - HTTP request counter with method/path/status labels
- `grpc_studio_http_request_duration_seconds` - HTTP latency histogram
- `grpc_studio_grpc_requests_total` - gRPC invocation counter with service/method/rpc_type/status
- `grpc_studio_grpc_request_duration_seconds` - gRPC latency histogram
- `grpc_studio_grpc_active_streams` - Active gRPC stream gauge
- `grpc_studio_ws_active_connections` - Active WebSocket connections
- `grpc_studio_cache_operations_total` - Cache hit/miss counter
- `grpc_studio_process_*` - Node.js process metrics (CPU, memory, event loop)

**OpenTelemetry Distributed Tracing:**

Enable in `config/backend.yaml`:

```yaml
observability:
  tracing:
    enabled: true
    exporter: otlp
    otlpEndpoint: http://localhost:4318/v1/traces
    sampleRate: 0.1  # 10% sampling
```

Traces include spans for HTTP requests, gRPC calls, and cache operations with W3C Trace Context propagation.

See `OBSERVABILITY.md` for complete documentation.

## Checks

```bash
npm run typecheck
npm run build
```
