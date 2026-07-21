# Migration Guide

## 1.x → 2.0

Version 2.0 adds **multi-target support**: a single gRPC Studio instance can now
connect to more than one gRPC server, and users switch between them from the
server selector in the UI. This changed the connection configuration from a
single target to a list, which is a **breaking change** to `values.yaml`.

If you deploy with the defaults or a values file that sets `connection.*`, you
must update it before upgrading. Auth, ingress, TLS secrets, and all other
values are unchanged.

### What changed

The single `connection.target` / `connection.mode` block was replaced by a
`connection.targets` list. Each entry is an independent target with its own
`name`, `host`, `port`, and `mode`.

**Before (1.x):**

```yaml
connection:
  mode: tls              # plaintext | tls | mtls
  target:
    host: my-grpc-server.example.com
    port: 443
  timeout:
    connect: 10000       # (never had any effect — see "Removed keys")
    request: 30000
  tls:
    verifyServerCert: true   # (never had any effect)
    serverName: ""           # (never had any effect)
```

**After (2.0):**

```yaml
connection:
  targets:
    - name: My gRPC Server   # display name shown in the UI (required)
      host: my-grpc-server.example.com
      port: 443
      mode: tls              # plaintext | tls | mtls
      timeout:
        request: 30000       # optional, unary RPC deadline in ms (default 30000)
```

### Field mapping

| 1.x key | 2.0 key | Notes |
|---|---|---|
| `connection.mode` | `connection.targets[].mode` | Per-target now |
| `connection.target.host` | `connection.targets[].host` | Per-target now |
| `connection.target.port` | `connection.targets[].port` | Per-target now |
| `connection.timeout.request` | `connection.targets[].timeout.request` | Per-target, optional |
| _(new)_ | `connection.targets[].name` | **Required** — display name in the UI |

### Removed keys

These keys existed in 1.x `values.yaml` but were never wired into any rendered
manifest — they had no effect. They are removed in 2.0; delete them from your
values file:

- `connection.timeout.connect`
- `connection.tls.verifyServerCert`
- `connection.tls.serverName`

### mTLS

mTLS is unchanged in shape: the client certificate still comes from a single
shared Secret (`secrets.existingSecret`) mounted at `/certs/`. In 2.0 it is
shared by **every** target whose `mode` is `mtls`. Just set `mode: mtls` on the
relevant target(s):

```yaml
connection:
  targets:
    - name: My gRPC Server
      host: my-grpc-server.example.com
      port: 443
      mode: mtls
secrets:
  existingSecret: my-grpc-client-cert
```

### Upgrading

1. Update your values file per the mapping above.
2. Preview the rendered config to confirm it looks right:

   ```bash
   helm template my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
     -f my-values.yaml --show-only templates/configmap-backend.yaml
   ```

3. Apply the upgrade:

   ```bash
   helm upgrade my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
     -f my-values.yaml --namespace grpc-studio
   ```

If `connection.targets` is empty or missing, the backend fails to start with
`At least one target is required`.

### `--set` upgrades

If you configured the target with `--set` flags instead of a values file, switch
to the indexed `targets[0]` form:

**Before:**

```bash
--set connection.mode=plaintext \
--set connection.target.host=my-grpc-server.default.svc.cluster.local \
--set connection.target.port=50051
```

**After:**

```bash
--set connection.targets[0].name="My gRPC Server" \
--set connection.targets[0].mode=plaintext \
--set connection.targets[0].host=my-grpc-server.default.svc.cluster.local \
--set connection.targets[0].port=50051
```

---

## Not using Helm?

The underlying backend `client` config changed the same way for local, Docker,
and raw Kubernetes deployments. See the top-level
[`MIGRATION.md`](../MIGRATION.md) for the `backend.yaml` migration.
