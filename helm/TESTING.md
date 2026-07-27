# Testing the Chart Locally with Minikube

This guide walks through testing the gRPC Studio Helm chart end-to-end on a local Minikube cluster, including a sample gRPC server to talk to.

## Prerequisites

- [minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [helm](https://helm.sh/docs/intro/install/) >= 3.10
- Docker (used by the Minikube Docker driver)

## 1. Start the cluster

```bash
minikube start --cpus 4 --memory 6g --driver docker
```

## 2. Build and load the images into Minikube

The chart references `grpc-studio-backend` and `grpc-studio-frontend` images. You can either build them from source or pull from GHCR.

### Option A — build from source

From the repository root:

```bash
eval $(minikube docker-env)

docker build -t grpc-studio-backend:dev  -f docker/backend/Dockerfile  .
docker build -t grpc-studio-frontend:dev -f docker/frontend/Dockerfile .
```

`eval $(minikube docker-env)` points your local Docker CLI at the Minikube daemon, so the resulting images are immediately available inside the cluster.

### Option B — pull released images

Skip this step. The chart defaults reference `ghcr.io/electronicarts/grpc-studio/{backend,frontend}` and Minikube can pull them directly.

## 3. Deploy a sample gRPC server

The chart only deploys gRPC Studio — it needs a target gRPC server to connect to. The repo ships two reflection-enabled example services under [`examples/`](../examples): **PetStore** and **BookStore**, both exercising the full proto3 feature set (deep nesting, oneOf, maps, streaming, well-known types, etc.).

**Option A — pull the published images** (built by the Docker Publish workflow):

```bash
docker pull ghcr.io/electronicarts/grpc-studio/petstore:latest
docker pull ghcr.io/electronicarts/grpc-studio/bookstore:latest
```

Use `ghcr.io/electronicarts/grpc-studio/petstore:latest` (port `50051`) or `.../bookstore:latest` (port `50052`) as the `image` below, with `imagePullPolicy: IfNotPresent`.

**Option B — build locally into Minikube:**

```bash
eval $(minikube docker-env)
docker build -t petstore-example:dev  ./examples/petstore
docker build -t bookstore-example:dev ./examples/bookstore
```

Deploy it:

```bash
kubectl create namespace grpc-test
kubectl -n grpc-test apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-grpc-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example-grpc-server
  template:
    metadata:
      labels:
        app: example-grpc-server
    spec:
      containers:
        - name: server
          image: petstore-example:dev
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 50051
---
apiVersion: v1
kind: Service
metadata:
  name: example-grpc-server
spec:
  selector:
    app: example-grpc-server
  ports:
    - port: 50051
      targetPort: 50051
EOF
```

> Any reflection-enabled gRPC server works — swap the image and port if you'd rather connect to your own.

## 4. Install the chart

From the repository root:

```bash
helm upgrade --install grpc-studio ./helm \
  --namespace grpc-studio --create-namespace \
  --set backend.image.repository=grpc-studio-backend \
  --set backend.image.tag=dev \
  --set backend.image.pullPolicy=IfNotPresent \
  --set frontend.image.repository=grpc-studio-frontend \
  --set frontend.image.tag=dev \
  --set frontend.image.pullPolicy=IfNotPresent \
  --set connection.targets[0].name=PetStore \
  --set connection.targets[0].mode=plaintext \
  --set connection.targets[0].host=example-grpc-server.grpc-test.svc.cluster.local \
  --set connection.targets[0].port=50051 \
  --set 'backend.server.cors.origins[0]=http://localhost:8080'
```

Wait for both pods to become ready:

```bash
kubectl -n grpc-studio rollout status deploy/grpc-studio-backend
kubectl -n grpc-studio rollout status deploy/grpc-studio-frontend
```

## 5. Access the UI

Port-forward the frontend service:

```bash
kubectl -n grpc-studio port-forward svc/grpc-studio-frontend 8080:80
```

Then open <http://localhost:8080>.

## 6. Verify

- The UI should load without "configuration not found" errors.
- The PetStore service appears in the sidebar with all 9 methods.
- The backend pod logs should show `gRPC Studio HTTP server started` with `targetCount: 1` and the target listed (`PetStore … mode: plaintext`).
- The frontend nginx logs should show successful proxy calls to `/api/grpc/*` and `/ws`.

```bash
kubectl -n grpc-studio logs deploy/grpc-studio-backend --tail=50
kubectl -n grpc-studio logs deploy/grpc-studio-frontend --tail=50
```

Exercise the RPCs from the UI to confirm both unary and streaming paths work end-to-end:

- **Unary** — run `GetPet` with `{"id": "pet-001"}` and `ListPets` with `{}`.
- **Server streaming** — run `WatchPets`; events should arrive every ~2s (confirms the WebSocket is connected).
- **Client streaming** — run `BulkCreatePets`, send a couple of messages, then end the stream.
- **Bidirectional streaming** — run `MonitorHealth` with `{"pet_id": "pet-001", "vital_signs": ["heart_rate"]}`.

> Note: `CreatePet`/`UpdatePet` wrap the pet in a `pet` field, e.g. `{"pet": {"name": "Pico", ...}}`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ImagePullBackOff` | Forgot `eval $(minikube docker-env)` before building, or `pullPolicy` not set to `IfNotPresent`/`Never` |
| Backend pod `CrashLoopBackOff` with `At least one target is required` | `connection.targets` is empty — provide at least one target with `name`, `host`, and `port` |
| Backend pod `CrashLoopBackOff` with `CORS misconfiguration: wildcard origin (*) cannot be combined with credentials` | `backend.server.cors.origins` set to `["*"]` — the backend sends credentials, so wildcard is rejected. List explicit origins (e.g. `http://localhost:8080`) or leave empty for the localhost defaults |
| Frontend pod `CrashLoopBackOff` writing `/etc/nginx/nginx.conf` | Stale chart version — pull latest (the chart no longer mounts a custom nginx config) |
| UI loads but shows "Configuration file not found" | `frontend.yaml` ConfigMap not mounted — check `kubectl describe pod` for the frontend |

## Cleanup

```bash
helm -n grpc-studio uninstall grpc-studio
kubectl delete namespace grpc-studio grpc-test
minikube stop  # or `minikube delete` to wipe the cluster
```
