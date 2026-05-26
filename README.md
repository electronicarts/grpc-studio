# gRPC Studio

gRPC Studio is a reflection-based UI for exploring and calling gRPC services. Point the backend at a gRPC server with server reflection enabled, and the frontend discovers services, renders protobuf request forms, invokes unary RPCs over HTTP, and bridges streaming RPCs over WebSocket.

## What It Supports

- Reflection discovery for `grpc.reflection.v1` and `v1alpha`
- Unary, server-streaming, client-streaming, and bidirectional-streaming RPCs
- Dynamic protobuf forms from `@bufbuild/protobuf` descriptors
- Nested messages, repeated fields, maps, oneofs, enums, bytes, timestamps, and wrapper types
- TLS and mTLS outbound gRPC connections
- Backend auth plugins for outbound metadata
- Optional Microsoft Entra ID auth for the web UI
- Per-method request history and shareable request links
- Production-grade observability with Prometheus metrics

## Demo

See the [light-mode demo gallery](demo/README.md) for screenshots and a walkthrough GIF covering service discovery, form/JSON/schema request inputs, response views, share links, request history, and all four RPC modes.

## Architecture

```
React UI
  | POST /api/grpc/discover      service + method list
  | POST /api/grpc/descriptor-set  base64 FileDescriptorSet for a message type
  | POST /api/grpc/invoke        unary RPC
  | WS   /ws/grpc                streaming RPCs
  v
Node/Express backend
  | grpc-js-reflection-client    list/describe/fetch descriptors
  | @bufbuild/protobuf           registry, JSON encode/decode, descriptor serialization
  | @connectrpc/connect-node     outgoing reflected gRPC client calls
  v
Target gRPC server with reflection enabled
```

The backend returns raw descriptor sets, not custom schema JSON. The frontend parses those descriptor sets into Buf `DescMessage` / `DescField` objects and renders directly from the descriptor API.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the default local setup:

```bash
npm run dev
```

Run the example PetStore service too:

```bash
npm run dev:all
```

Point gRPC Studio at any local gRPC server with reflection enabled:

```bash
npm run quickstart -- 50051
```

Or pass an explicit host and port:

```bash
npm run quickstart -- localhost:50051
```

This starts the frontend on `http://localhost:3000` and the backend on `http://localhost:3001`, with the backend targeting the reflected gRPC service you provided.

Start only the backend with the checked-in config:

```bash
cd backend
GRPC_STUDIO_CONFIG=../config/backend.yaml npm start
```

Start only the frontend:

```bash
cd frontend
npm run dev
```

By default the frontend runs on `http://localhost:3000` and the backend on `http://localhost:3001`.

## Configuration

Backend config is YAML-driven. Set `GRPC_STUDIO_CONFIG` to the backend YAML file when starting the backend.

```yaml
client:
  mode: plaintext # plaintext | tls | mtls
  target:
    host: localhost
    port: 50051

auth:
  plugins: {}

observability:
  enabled: true
  metrics:
    enabled: true
    path: /metrics
    includeSystemMetrics: true
```

Frontend config lives in `frontend/public/config/frontend.yaml` at runtime, or `config/frontend.yaml` for repo examples:

```yaml
api:
  baseUrl: "http://localhost:3001"

auth:
  enabled: false
```

Checked-in example configs live under `config/`, including the default plaintext backend config, a TLS backend example, an mTLS example, and observability examples.

## Development Commands

```bash
npm run build:shared
cd backend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:run
```

The shared package owns API contract types used by both frontend and backend.

## Project Layout

```
backend/    Express API, reflection discovery, dynamic invocation, WebSocket streams
frontend/   React UI, descriptor cache, schema renderer, method explorer
shared/     Shared HTTP/WebSocket contract types
example/    Reflection-enabled PetStore gRPC test server
config/     Example backend/frontend YAML configs
```

## Observability

The backend exposes Prometheus metrics at `/metrics`.

**Key Metrics:**
- HTTP request rate, latency, and errors (RED method)
- gRPC invocation rate, latency, and active streams
- WebSocket connection counts and durations
- Cache hit/miss rates
- Node.js process metrics (CPU, memory, event loop)

**Prometheus Scrape Example:**
```yaml
scrape_configs:
  - job_name: 'grpc-studio'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

See `OBSERVABILITY.md` for complete documentation.

## Notes

- The target server must support gRPC reflection.
- Protobuf descriptors are resolved transitively from reflection and cached by TTL.
- Streaming calls are controlled with JSON WebSocket messages and encoded to real gRPC messages on the backend.
- mTLS certificate status is surfaced in the UI when mTLS is configured.

## Docker Deployment

Pre-built Docker images are available on GitHub Container Registry:

```bash
# Pull images
docker pull ghcr.io/electronicarts/grpc-studio/backend:latest
docker pull ghcr.io/electronicarts/grpc-studio/frontend:latest

# Run with docker-compose
docker-compose up -d
```

See [docker/README.md](docker/README.md) for complete deployment documentation including Kubernetes manifests.

## CI/CD

This project uses GitHub Actions for continuous integration and Docker image publishing:

- **CI Pipeline** (`.github/workflows/ci.yml`): Runs on every push and pull request
  - Install dependencies
  - Copyright header checks
  - TypeScript type checking
  - ESLint for frontend and backend
  - Build frontend and backend
  - Run all tests

- **Docker Publish** (`.github/workflows/docker-publish.yml`): Runs on push to main and tags
  - Builds multi-architecture images (AMD64, ARM64)
  - Publishes to GitHub Container Registry
  - Creates GitHub releases for version tags

## Contributing

Before you can contribute, EA must have a Contributor License Agreement (CLA) on file that has been signed by each contributor. You can sign [here](https://electronicarts.na1.echosign.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhByHRvZqmltGtliuExmuV-WNzlaJGPhbSRg2ufuPsM3P0QmILZjLpkGslg24-UJtek*).

## License

[BSD-3-Clause](LICENSE)
