# gRPC Studio Helm Chart

[gRPC Studio](https://github.com/electronicarts/grpc-studio) is a self-hosted web UI for exploring and testing gRPC services — similar to `grpcui` but designed to run persistently in Kubernetes. It supports server reflection, mTLS, OAuth2/bearer token auth, and multiple concurrent service connections.

This chart deploys the backend and frontend as separate Deployments with ClusterIP Services. Ingress, DNS, and TLS are left to your infrastructure. See [`examples/`](examples/) for nginx-ingress and Istio setups.

## Prerequisites

- Kubernetes >= 1.24
- Helm >= 3.10

## Installing

```bash
helm upgrade --install my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  --set connection.target.host=my-grpc-server.default.svc.cluster.local \
  --set connection.target.port=50051 \
  --set connection.mode=plaintext \
  --namespace grpc-studio --create-namespace
```

```bash
kubectl port-forward svc/my-grpc-studio-frontend 8080:80 -n grpc-studio
```

## Examples

| Example | Description |
|---|---|
| [`examples/basic/`](examples/basic/) | Port-forward only, no ingress |
| [`examples/nginx-ingress/`](examples/nginx-ingress/) | ingress-nginx + cert-manager |
| [`examples/istio/`](examples/istio/) | Istio Gateway + VirtualService + cert-manager |

Each example contains a `values.yaml` for the chart and any companion raw manifests to apply separately.

## Configuration

All available options are documented in the [Values](#values) table below.

### Connection

```yaml
connection:
  mode: plaintext   # plaintext | tls | mtls
  target:
    host: my-grpc-server.default.svc.cluster.local
    port: 50051
```

### Ingress

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: grpc-studio.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: grpc-studio-tls
      hosts:
        - grpc-studio.example.com
```

When serving the UI on a custom host, add that origin to the backend CORS allowlist, or streaming RPCs fail with a `WebSocket connection error`:

```yaml
backend:
  server:
    cors:
      origins:
        - https://grpc-studio.example.com
```

### mTLS client certificates

When `connection.mode: mtls`, provide a Secret containing the client certificate. The chart mounts it at `/certs/` — it never creates the Secret itself.

With cert-manager (auto-rotated):

```yaml
# Apply once — cert-manager creates and rotates the Secret
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: grpc-studio-client-cert
  namespace: grpc-studio
spec:
  secretName: grpc-studio-client-cert
  issuerRef:
    name: my-internal-ca
    kind: ClusterIssuer
  usages: [client auth, digital signature, key encipherment]
  duration: 8760h
  renewBefore: 720h
```

```yaml
connection:
  mode: mtls
secrets:
  existingSecret: grpc-studio-client-cert
  # keys match cert-manager's output (tls.crt / tls.key / ca.crt) by default.
  # Set ca: ca.crt only if the gRPC server's cert was issued by the same internal CA.
```

Or manually:

```bash
kubectl create secret generic my-grpc-client-cert \
  --from-file=tls.crt=./client.crt \
  --from-file=tls.key=./client.key \
  -n grpc-studio
```

```yaml
connection:
  mode: mtls
secrets:
  existingSecret: my-grpc-client-cert
```

### Authentication

Bearer token (Secret must have key `token`):

```yaml
auth:
  defaultPlugin: bearer-token
  bearerToken:
    enabled: true
    secretRef: my-token-secret
```

OAuth2 client credentials (Secret must have key `clientSecret`):

```yaml
auth:
  defaultPlugin: oauth2-client-credentials
  oauth2:
    enabled: true
    tokenUrl: https://auth.example.com/oauth/token
    clientId: my-client-id
    clientSecretRef: my-oauth-secret
    scope: grpc.read grpc.write
```

### Multiple instances

Deploy one release per gRPC service using different release names:

```bash
helm upgrade --install payments oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  --set connection.target.host=payments.default.svc.cluster.local \
  --namespace grpc-studio --create-namespace

helm upgrade --install users oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  --set connection.target.host=users.default.svc.cluster.local \
  --namespace grpc-studio
```

## Parameters

Every parameter below is wired into the rendered manifests. For the canonical defaults, see [`values.yaml`](values.yaml).

### Global / common

| Key | Description | Default |
|---|---|---|
| `nameOverride` | Override the chart name portion of resource names | `""` |
| `fullnameOverride` | Override the full name of resources | `""` |
| `imagePullSecrets` | Secrets for pulling images from private registries | `[]` |
| `serviceAccount.create` | Create a ServiceAccount | `true` |
| `serviceAccount.annotations` | Annotations for the ServiceAccount | `{}` |
| `serviceAccount.name` | ServiceAccount name (generated if empty) | `""` |
| `podAnnotations` | Annotations added to all pods | `{}` |
| `podLabels` | Labels added to all pods | `{}` |
| `podSecurityContext` | Pod-level security context | `{}` |
| `securityContext` | Container-level security context | `{}` |
| `nodeSelector` | Node selector for pod scheduling | `{}` |
| `tolerations` | Tolerations for pod scheduling | `[]` |
| `affinity` | Affinity rules for pod scheduling | `{}` |
| `extraVolumes` | Additional volumes for both deployments | `[]` |
| `extraVolumeMounts` | Additional volume mounts for both deployments | `[]` |

### Backend

| Key | Description | Default |
|---|---|---|
| `backend.replicaCount` | Number of backend replicas | `1` |
| `backend.image.repository` | Backend image repository | `ghcr.io/electronicarts/grpc-studio/backend` |
| `backend.image.tag` | Backend image tag (defaults to chart appVersion) | `""` |
| `backend.image.pullPolicy` | Backend image pull policy | `IfNotPresent` |
| `backend.port` | Backend container/service port | `3001` |
| `backend.server.host` | Address the backend binds to | `"0.0.0.0"` |
| `backend.server.cors.enabled` | Enable CORS on the backend | `true` |
| `backend.server.cors.origins` | Allowed browser origins (incl. streaming WebSocket). Must include the UI's URL or streaming RPCs fail. Empty = backend default (`localhost:3000`, `localhost:4173`). Do not use `["*"]` — a wildcard with credentials crashes the backend at startup; list explicit origins | `[]` |
| `backend.logging.level` | Log level (`debug`/`info`/`warn`/`error`), set via `LOG_LEVEL` | `info` |
| `backend.logging.format` | Log format (`pretty`/`json`), set via `LOG_FORMAT` | `pretty` |
| `backend.cache.reflection.ttlMs` | Reflection/schema cache TTL (ms) | `3600000` |
| `backend.cache.reflection.maxEntries` | Reflection/schema cache max entries | `1000` |
| `backend.env` | Extra environment variables | `[]` |
| `backend.livenessProbe` | Backend liveness probe | see [values.yaml](values.yaml) |
| `backend.readinessProbe` | Backend readiness probe | see [values.yaml](values.yaml) |
| `backend.resources` | Backend resource requests/limits | `{}` |
| `backend.service.type` | Backend Service type | `ClusterIP` |
| `backend.service.nameOverride` | Override the Service name used as the nginx upstream | `""` |
| `backend.service.annotations` | Backend Service annotations | `{}` |

### Frontend

| Key | Description | Default |
|---|---|---|
| `frontend.replicaCount` | Number of frontend replicas | `1` |
| `frontend.image.repository` | Frontend image repository | `ghcr.io/electronicarts/grpc-studio/frontend` |
| `frontend.image.tag` | Frontend image tag (defaults to chart appVersion) | `""` |
| `frontend.image.pullPolicy` | Frontend image pull policy | `IfNotPresent` |
| `frontend.port` | Frontend container/service port | `80` |
| `frontend.env` | Extra environment variables | `[]` |
| `frontend.livenessProbe` | Frontend liveness probe | see [values.yaml](values.yaml) |
| `frontend.readinessProbe` | Frontend readiness probe | see [values.yaml](values.yaml) |
| `frontend.resources` | Frontend resource requests/limits | `{}` |
| `frontend.service.type` | Frontend Service type | `ClusterIP` |
| `frontend.service.annotations` | Frontend Service annotations | `{}` |

### Ingress

| Key | Description | Default |
|---|---|---|
| `ingress.enabled` | Create an Ingress resource | `false` |
| `ingress.className` | IngressClass name | `""` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress host/path rules | `[{host: grpc-studio.example.com, paths: [{path: /, pathType: Prefix}]}]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### Connection

| Key | Description | Default |
|---|---|---|
| `connection.mode` | Connection mode to the target gRPC server: `plaintext`, `tls`, or `mtls` | `tls` |
| `connection.target.host` | Target gRPC server host (**required**) | `your-grpc-server.example.com` |
| `connection.target.port` | Target gRPC server port | `443` |
| `connection.timeout.connect` | Connect timeout (ms) | `10000` |
| `connection.timeout.request` | Request timeout — maps to the backend unary RPC deadline (ms) | `30000` |
| `connection.tls.verifyServerCert` | Verify the server certificate | `true` |
| `connection.tls.serverName` | Override the server name for TLS verification | `""` |

### Authentication (backend)

| Key | Description | Default |
|---|---|---|
| `auth.defaultPlugin` | Default auth plugin: `none`, `bearer-token`, or `oauth2-client-credentials` | `none` |
| `auth.bearerToken.enabled` | Enable bearer token auth | `false` |
| `auth.bearerToken.secretRef` | Name of a Secret with key `token` | `""` |
| `auth.oauth2.enabled` | Enable OAuth2 client-credentials auth | `false` |
| `auth.oauth2.tokenUrl` | OAuth2 token endpoint | `""` |
| `auth.oauth2.clientId` | OAuth2 client ID | `""` |
| `auth.oauth2.clientSecretRef` | Name of a Secret with key `clientSecret` | `""` |
| `auth.oauth2.scope` | OAuth2 scopes | `""` |
| `auth.oauth2.tokenCacheTimeMs` | Token cache duration (ms) | `300000` |
| `auth.oauth2.requestTimeoutMs` | Token request timeout (ms) | `10000` |
| `auth.oauth2.maxRetries` | Max token request retries | `3` |
| `auth.oauth2.retryDelayMs` | Delay between token retries (ms) | `1000` |

### mTLS client certificates

| Key | Description | Default |
|---|---|---|
| `secrets.existingSecret` | Name of an existing Secret holding the client certificate (required for `mtls`) | `""` |
| `secrets.keys.cert` | Secret key for the client cert | `tls.crt` |
| `secrets.keys.key` | Secret key for the client key | `tls.key` |
| `secrets.keys.ca` | Secret key for the CA cert (empty if not needed) | `""` |

### Health

| Key | Description | Default |
|---|---|---|
| `app.health.enabled` | Enable the backend health endpoint | `true` |
| `app.health.endpoint` | Health endpoint path | `/health` |

### UI

| Key | Description | Default |
|---|---|---|
| `ui.api.baseUrl` | Base URL for API calls (empty = same origin) | `""` |
| `ui.api.endpoints.config` | Config endpoint path | `/api/grpc/config` |
| `ui.api.endpoints.discover` | Discover endpoint path | `/api/grpc/discover` |
| `ui.api.endpoints.invoke` | Invoke endpoint path | `/api/grpc/invoke` |
| `ui.api.endpoints.descriptorSet` | Descriptor-set endpoint path | `/api/grpc/descriptor-set` |
| `ui.api.endpoints.status` | Status endpoint path | `/api/grpc/status` |
| `ui.api.endpoints.health` | Health endpoint path | `/health` |
| `ui.api.timeout` | UI API timeout (ms) | `30000` |
| `ui.api.websocketTimeout` | Streaming WebSocket connect timeout (ms) | `5000` |
| `ui.auth.enabled` | Enable UI authentication | `false` |
| `ui.auth.provider` | UI auth provider (only `entra-id` is supported) | `entra-id` |
| `ui.auth.entraId.tenantId` | Entra ID tenant ID | `""` |
| `ui.auth.entraId.clientId` | Entra ID application (client) ID | `""` |
| `ui.auth.entraId.redirectUri` | Redirect URI (empty = `window.location.origin`) | `""` |
| `ui.auth.entraId.scopes` | OAuth scopes requested | `[openid, profile, email]` |
| `ui.auth.entraId.cloud` | Entra cloud: `public`, `government`, `china`, or `germany` | `public` |

## Uninstalling

```bash
helm uninstall my-grpc-studio -n grpc-studio
```

## License

[BSD-3-Clause](https://opensource.org/licenses/BSD-3-Clause)
