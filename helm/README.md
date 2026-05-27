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
  --set connection.mode=insecure \
  --namespace grpc-studio --create-namespace
```

```bash
kubectl port-forward svc/my-grpc-studio-grpc-studio-frontend 8080:80 -n grpc-studio
```

## Examples

| Example | Description |
|---|---|
| [`examples/basic/`](examples/basic/) | Port-forward only, no ingress |
| [`examples/nginx-ingress/`](examples/nginx-ingress/) | ingress-nginx + cert-manager |
| [`examples/istio/`](examples/istio/) | Istio Gateway + VirtualService + cert-manager |

Each example contains a `values.yaml` for the chart and any companion raw manifests to apply separately.

## Configuration

All available options are documented in [`values.yaml`](values.yaml).

### Connection

```yaml
connection:
  mode: insecure   # insecure | tls | mtls
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

## Uninstalling

```bash
helm uninstall my-grpc-studio -n grpc-studio
```

## License

[MIT](https://opensource.org/licenses/MIT)

