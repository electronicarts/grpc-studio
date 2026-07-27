# Basic Example

Minimal deployment with no ingress. Access gRPC Studio via `kubectl port-forward`.

## Prerequisites

- A Kubernetes cluster

## Usage

```bash
helm upgrade --install my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  -f helm/examples/basic/values.yaml \
  --namespace grpc-studio \
  --create-namespace
```

```bash
kubectl port-forward svc/my-grpc-studio-grpc-studio-frontend 8080:80 -n grpc-studio
open http://localhost:8080
```

## What to change

| Value | Description |
|---|---|
| `connection.targets[0].name` | Display name shown in the UI |
| `connection.targets[0].host` | Hostname of your gRPC server |
| `connection.targets[0].port` | Port of your gRPC server |
| `connection.targets[0].mode` | `plaintext`, `tls`, or `mtls` |

Add more entries under `connection.targets` to expose several gRPC servers in one UI.
