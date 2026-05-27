# gRPC Studio — Examples

The chart only produces Deployments, Services, ConfigMaps, and an optional standard Ingress.
Everything else (DNS, TLS, ingress controllers, service meshes) is your infrastructure — the examples below show how to wire them up.

```
examples/
  basic/                   No ingress, port-forward access
  nginx-ingress/           ingress-nginx + cert-manager Certificate
  istio/                   Istio Gateway + VirtualService + cert-manager Certificate
```

## Usage

Each example directory contains:
- `values.yaml` — passed to `helm install`
- Additional `*.yaml` files — raw Kubernetes manifests you apply separately

```bash
# 1. Install the chart
helm upgrade --install my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  -f helm/examples/<example>/values.yaml \
  --namespace grpc-studio \
  --create-namespace

# 2. Apply any companion manifests
kubectl apply -f helm/examples/<example>/<manifest>.yaml
```
