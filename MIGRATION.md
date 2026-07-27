# Migration Guide

## 1.x → 2.0

Version 2.0 adds **multi-target support**: a single gRPC Studio instance can now
connect to more than one gRPC server, and users switch between them from the
server selector in the UI.

This changed the backend `client` configuration from a **single target** to a
**list of targets** — a breaking change to `backend.yaml`. It affects every way
of running gRPC Studio (local, Docker, Kubernetes, and Helm). Update your config
before upgrading.

Auth, observability, cache, and all other config are unchanged.

### Backend config (`backend.yaml`)

This is the core change and applies to **all** deployments — local `npm`, Docker,
docker-compose, raw Kubernetes manifests, and the Helm chart (which generates this
file for you; see [Helm](#helm-chart) below).

**Before (1.x):**

```yaml
client:
  mode: plaintext        # plaintext | tls | mtls
  target:
    host: localhost
    port: 50051
  rpc:
    unaryDeadlineMs: 30000
    streamDeadlineMs: 120000
  security:              # mtls only
    clientCertPath: /path/to/client.crt
    clientKeyPath: /path/to/client.key
    caCertPath: /path/to/ca.crt
```

**After (2.0):**

```yaml
client:
  targets:
    - name: Local Server   # display name shown in the UI (required)
      host: localhost
      port: 50051
      mode: plaintext      # plaintext | tls | mtls
      rpc:
        unaryDeadlineMs: 30000
        streamDeadlineMs: 120000
      security:            # mtls only
        clientCertPath: /path/to/client.crt
        clientKeyPath: /path/to/client.key
        caCertPath: /path/to/ca.crt
    # Add more targets to expose several servers in one UI:
    # - name: Payments
    #   host: payments.example.com
    #   port: 443
    #   mode: tls
```

**What moved:** everything that used to live directly under `client`
(`mode`, `target.host`, `target.port`, `rpc`, `keepalive`, `security`,
`reflection`, `maxReceiveMessageBytes`) is now a property of each entry in
`client.targets`. `target.host`/`target.port` flattened to `host`/`port`.

**What's new:** each target requires a `name` (its label in the UI's server
selector). At least one target is required — the backend fails to start with
`At least one target is required` otherwise.

A complete example lives in
[`config/backend-multi-target.yaml`](config/backend-multi-target.yaml).

### Environment variable overrides

The `GRPC_TARGET_HOST` and `GRPC_TARGET_PORT` overrides still work — they now
apply to the **first** target (`client.targets[0]`). No change needed for
docker-compose's `TARGET_HOST` / `TARGET_PORT`.

### Docker / docker-compose

The bundled `config/backend.yaml` is already in the new format, so
`docker-compose up` works as-is. If you mount your own `backend.yaml`, migrate
its `client` block per the [Backend config](#backend-config-backendyaml) section
above.

### Helm chart

The chart's `values.yaml` changed from a single `connection.target` to a
`connection.targets` list. See the field mapping and `--set` examples in
[`helm/MIGRATION.md`](helm/MIGRATION.md).
