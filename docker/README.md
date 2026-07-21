# Docker Deployment Guide

This directory contains Docker configurations for deploying gRPC Studio in production.

## Quick Start

### Using Docker Compose

```bash
# Start both frontend and backend
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the UI at http://localhost:80

### Using Pre-built Images from GitHub Container Registry

Pull the latest images:

```bash
# Backend
docker pull ghcr.io/electronicarts/grpc-studio/backend:latest

# Frontend
docker pull ghcr.io/electronicarts/grpc-studio/frontend:latest
```

## Configuration

### Backend Configuration

> **Upgrading from 1.x?** The `client` config changed from a single target to a list of targets. See [`MIGRATION.md`](../MIGRATION.md).

Create a `config/backend.yaml` file:

```yaml
server:
  port: 3001
  host: 0.0.0.0

client:
  targets:
    - name: My gRPC Server  # display name shown in the UI
      host: your-grpc-server.com
      port: 50051
      mode: plaintext  # or tls, mtls

observability:
  enabled: true
  metrics:
    enabled: true
    path: /metrics
  tracing:
    enabled: false
```

Mount the config when running:

```bash
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/config/backend.yaml:/config/backend.yaml:ro \
  ghcr.io/electronicarts/grpc-studio/backend:latest
```

### Frontend Configuration

Create a `config/frontend.yaml` file:

```yaml
api:
  baseUrl: "http://localhost:3001"

auth:
  enabled: false
```

The frontend requires the config to be mounted:

```bash
docker run -d \
  -p 80:80 \
  -v $(pwd)/config/frontend.yaml:/config/frontend.yaml:ro \
  -e BACKEND_URL=backend:3001 \
  ghcr.io/electronicarts/grpc-studio/frontend:latest
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `GRPC_STUDIO_CONFIG` | Path to backend YAML config | `/config/backend.yaml` |
| `PORT` | HTTP server port | `3001` |
| `GRPC_TARGET_HOST` | gRPC server host | From config |
| `GRPC_TARGET_PORT` | gRPC server port | From config |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Backend URL (host:port, no http://) | `localhost:3001` |

## Health Checks

Both images include health checks:

**Backend:**
```bash
curl http://localhost:3001/health
```

**Frontend:**
```bash
curl http://localhost:80/health
```

## Kubernetes Deployment

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-studio-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grpc-studio-backend
  template:
    metadata:
      labels:
        app: grpc-studio-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/electronicarts/grpc-studio/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: GRPC_TARGET_HOST
          value: "your-grpc-server"
        - name: GRPC_TARGET_PORT
          value: "50051"
        volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: backend-config
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-studio-backend
spec:
  selector:
    app: grpc-studio-backend
  ports:
  - port: 3001
    targetPort: 3001
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
data:
  backend.yaml: |
    server:
      port: 3001
      host: 0.0.0.0
    client:
      targets:
        - name: My gRPC Server
          host: your-grpc-server
          port: 50051
          mode: plaintext
    observability:
      enabled: true
      metrics:
        enabled: true
```

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-studio-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grpc-studio-frontend
  template:
    metadata:
      labels:
        app: grpc-studio-frontend
    spec:
      containers:
      - name: frontend
        image: ghcr.io/electronicarts/grpc-studio/frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: BACKEND_URL
          value: "grpc-studio-backend:3001"
        volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: frontend-config
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-studio-frontend
spec:
  type: LoadBalancer
  selector:
    app: grpc-studio-frontend
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
data:
  frontend.yaml: |
    api:
      baseUrl: "http://grpc-studio-backend:3001"
    auth:
      enabled: false
```

## Security Considerations

1. **Non-root user**: Both images run as non-root user (UID 1001 for backend, nginx user for frontend)
2. **Read-only config**: Mount configuration files as read-only volumes
3. **Security updates**: Images are built on Alpine Linux with latest security patches
4. **No secrets in images**: All sensitive configuration is provided via mounted volumes
5. **TLS/mTLS support**: Backend supports TLS and mTLS for gRPC connections via config

## Observability

### Prometheus Metrics

The backend exposes Prometheus metrics at `/metrics`:

```bash
# Add to prometheus.yml
scrape_configs:
  - job_name: 'grpc-studio'
    static_configs:
      - targets: ['grpc-studio-backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Distributed Tracing

Enable OpenTelemetry tracing in `backend.yaml`:

```yaml
observability:
  tracing:
    enabled: true
    exporter: otlp
    otlpEndpoint: http://jaeger-collector:4318/v1/traces
    sampleRate: 0.1
```

## Multi-Architecture Support

Both images support AMD64 and ARM64:

```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t myregistry/backend:latest .
```

## Troubleshooting

### Backend won't start

1. Check config file is mounted: `docker exec <container> cat /config/backend.yaml`
2. Check logs: `docker logs <container>`
3. Verify gRPC target is reachable

### Frontend shows "Configuration file not found"

1. Ensure `frontend.yaml` is mounted at `/config/frontend.yaml`
2. Check file permissions are readable by nginx user

### WebSocket connections fail

1. Verify `BACKEND_URL` environment variable is set correctly (host:port format)
2. Check nginx logs: `docker logs <container>`
3. Ensure backend is healthy: `curl http://backend:3001/health`

## Building Images Locally

```bash
# Backend
docker build -f docker/backend/Dockerfile -t grpc-studio-backend:local .

# Frontend
docker build -f docker/frontend/Dockerfile -t grpc-studio-frontend:local .
```

## License

[BSD-3-Clause](../LICENSE)
