# nginx-ingress Example

Exposes gRPC Studio over HTTPS using [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) with TLS terminated at the Ingress. [cert-manager](https://cert-manager.io) provisions the certificate from Let's Encrypt automatically.

## Prerequisites

- [ingress-nginx](https://kubernetes.github.io/ingress-nginx/deploy/)
- [cert-manager](https://cert-manager.io/docs/installation/)

## Files

| File | Description |
|---|---|
| `values.yaml` | Helm chart values |
| `certificate.yaml` | cert-manager `ClusterIssuer` + `Certificate` (apply separately) |

## Usage

**1. Edit `certificate.yaml`** — replace `ops@example.com` and `grpc-studio.example.com` with your email and domain.

**2. Apply the cert-manager resources:**

```bash
kubectl apply -f helm/examples/nginx-ingress/certificate.yaml
```

Wait for the certificate to be issued:

```bash
kubectl get certificate -n grpc-studio
```

**3. Edit `values.yaml`** — replace `grpc-studio.example.com` with your domain and update `connection.target.host`.

**4. Install the chart:**

```bash
helm upgrade --install my-grpc-studio oci://ghcr.io/electronicarts/helm-charts/grpc-studio \
  -f helm/examples/nginx-ingress/values.yaml \
  --namespace grpc-studio \
  --create-namespace
```

## DNS

Point your domain at the ingress-nginx external IP:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Use the `EXTERNAL-IP` to create an A record (or use [external-dns](https://github.com/kubernetes-sigs/external-dns) to manage it automatically via `frontend.service.annotations`).

## Using a different ACME solver

The example uses HTTP-01 (requires port 80 to be reachable). For private clusters or wildcard certs, switch to DNS-01 in `certificate.yaml`. See the [cert-manager DNS-01 docs](https://cert-manager.io/docs/configuration/acme/dns01/).
