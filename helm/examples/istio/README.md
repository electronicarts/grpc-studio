# Istio Example

Exposes gRPC Studio via an Istio Gateway and VirtualService with TLS terminated at the Gateway. [cert-manager](https://cert-manager.io) provisions the certificate.

The Helm chart deploys the app (Deployments, Services, ConfigMaps) only. The Istio and cert-manager resources in this directory are applied separately — they are not managed by the chart.

## Prerequisites

- [Istio](https://istio.io/latest/docs/setup/install/)
- [cert-manager](https://cert-manager.io/docs/installation/)

## Files

| File | Description |
|---|---|
| `values.yaml` | Helm chart values |
| `certificate.yaml` | cert-manager `ClusterIssuer` + `Certificate` |
| `gateway.yaml` | Istio `Gateway` |
| `virtualservice.yaml` | Istio `VirtualService` |

## Usage

**1. Edit all four files** — replace `grpc-studio.example.com` with your domain, and update `connection.targets` in `values.yaml`.

**2. Install the chart:**

```bash
helm upgrade --install my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  -f helm/examples/istio/values.yaml \
  --namespace grpc-studio \
  --create-namespace
```

**3. Apply the cert-manager certificate** (Secret goes into `istio-system`, which Istio requires):

```bash
kubectl apply -f helm/examples/istio/certificate.yaml
```

Wait for the certificate to be issued:

```bash
kubectl get certificate -n istio-system
```

**4. Apply the Istio Gateway and VirtualService:**

```bash
kubectl apply -f helm/examples/istio/gateway.yaml
kubectl apply -f helm/examples/istio/virtualservice.yaml
```

## DNS

Point your domain at the Istio ingress gateway external IP:

```bash
kubectl get svc -n istio-system istio-ingressgateway
```

Use [external-dns](https://github.com/kubernetes-sigs/external-dns) with `--source=istio-virtualservice` to manage DNS records automatically, or create an A record manually.

## DNS-01 challenge (recommended for Istio)

Istio's Gateway may not be available when cert-manager tries the HTTP-01 challenge. DNS-01 avoids this dependency. Update the `solvers` block in `certificate.yaml` for your DNS provider — see the [cert-manager DNS-01 docs](https://cert-manager.io/docs/configuration/acme/dns01/).

## Service name

The VirtualService routes to the frontend Service, whose name is derived from the Helm release name:

```
<release-name>-grpc-studio-frontend.<namespace>.svc.cluster.local
```

If you change the release name, update the `host` in `virtualservice.yaml` to match.
