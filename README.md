# gRPC Studio

gRPC Studio is a reflection-based UI for exploring and calling gRPC services. Point the backend at a gRPC server with server reflection enabled, and the frontend discovers services, renders protobuf request forms, invokes unary RPCs over HTTP, and bridges streaming RPCs over WebSocket.

## What It Supports

- Reflection discovery for `grpc.reflection.v1` and `v1alpha`
- Unary, server-streaming, client-streaming, and bidirectional-streaming RPCs
- Dynamic protobuf forms from `@bufbuild/protobuf` descriptors
- Nested messages, repeated fields, maps, oneofs, enums, bytes, timestamps, and wrapper types
- Multiple gRPC targets in one instance, switchable from the UI's server selector
- TLS and mTLS outbound gRPC connections, configurable per target
- Backend auth plugins for outbound metadata
- Per-request metadata (custom gRPC headers) editable from the UI's Metadata tab
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

### 1. Install dependencies

```bash
npm install
```

### 2. Try it out (recommended first run)

Start everything at once — the UI, the backend, and both bundled example gRPC servers (PetStore + BookStore):

```bash
npm run dev:all
```

Then open **http://localhost:3000**. Both example services appear in the UI's server selector, ready to explore. This is the easiest way to see gRPC Studio working end to end.

| What starts | URL / port |
| ----------- | ---------- |
| Frontend (UI) | http://localhost:3000 |
| Backend (API) | http://localhost:3001 |
| PetStore example gRPC server | localhost:50051 |
| BookStore example gRPC server | localhost:50052 |

> Every `dev` command frees these ports first, so a leftover process from a previous run won't block startup. To clear them manually, run `npm run stop`.

### 3. Run individual pieces

Sometimes you only want part of the stack. Run each in its own terminal.

**Frontend only** (the React UI):

```bash
npm run dev:frontend
```

**Backend only** (the API, using the default `config/backend.yaml`):

```bash
npm run dev:backend
```

**PetStore example server only** (`localhost:50051`):

```bash
npm run dev:petstore
```

**BookStore example server only** (`localhost:50052`):

```bash
npm run dev:bookstore
```

**UI + backend only** (no example servers — point the backend at your own service via config):

```bash
npm run dev
```

### 4. Point gRPC Studio at your own gRPC server

If you already have a gRPC server with **reflection enabled**, use `quickstart` — it starts the UI and backend and connects them to the server(s) you name, no config file needed.

```bash
# a single server, by port (defaults to localhost) …
npm run quickstart -- 50051

# … or an explicit host:port
npm run quickstart -- my-service.local:50051
```

Connect to **several servers at once** — each becomes a selectable target in the UI:

```bash
# bare ports/hosts
npm run quickstart -- 50051 50052

# named targets, with per-target mode (plaintext or tls)
npm run quickstart -- \
  --target localhost:50051 \
  --target payments=payments.example.com:443,mode=tls
```

`quickstart` supports `plaintext` and `tls`. For **mTLS** (which needs client certificate paths) or any advanced setup, write a backend YAML and start the backend directly:

```bash
cd backend
GRPC_STUDIO_CONFIG=../path/to/your-config.yaml npm run dev
```

See [Configuration](#configuration) for the YAML format.

## Configuration

> **Upgrading from 1.x?** The backend `client` config changed from a single target to a list of targets. See [`MIGRATION.md`](MIGRATION.md).

Backend config is YAML-driven. Set `GRPC_STUDIO_CONFIG` to the backend YAML file when starting the backend.

The backend connects to one or more gRPC targets. Each target appears as a selectable server in the UI, and at least one is required. TLS/mTLS is configured per target.

```yaml
client:
  targets:
    - name: "PetStore"        # display name shown in the UI
      host: localhost
      port: 50051
      mode: plaintext         # plaintext | tls | mtls
    - name: "Payments"
      host: payments.example.com
      port: 443
      mode: tls
    # mTLS target with client certificates:
    # - name: "Users"
    #   host: users.example.com
    #   port: 443
    #   mode: mtls
    #   security:
    #     clientCertPath: ./certs/client.crt
    #     clientKeyPath: ./certs/client.key
    #     caCertPath: ./certs/ca.crt

auth:
  plugins: {}

observability:
  enabled: true
  metrics:
    enabled: true
    path: /metrics
    includeSystemMetrics: true
```

See `config/backend-multi-target.yaml` for a complete multi-target example.

Frontend config lives in `frontend/public/config/frontend.yaml` at runtime, or `config/frontend.yaml` for repo examples:

```yaml
api:
  baseUrl: "http://localhost:3001"

auth:
  enabled: false
```

Checked-in example configs live under `config/`, including the default backend config, a multi-target example, a TLS backend example, and observability examples.

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
examples/   Reflection-enabled gRPC test servers (petstore, bookstore)
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
- Request metadata (custom gRPC headers) can be added per request from the **Metadata** tab of the request panel, for both unary and streaming RPCs. Keys are lowercased and validated (letters, digits, and `-_.`; binary `-bin` keys are not supported). Configured auth-plugin and trusted user (`x-user-*`) headers always take precedence over user-supplied metadata with the same key, so the UI cannot spoof identity or auth. Metadata is saved with per-method request history and included in shareable request links (re-validated on open).

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
