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

The chart only deploys gRPC Studio — it needs a target gRPC server to connect to. Any reflection-enabled gRPC server works. The example below uses [`fullstorydev/grpcui`'s example server](https://github.com/fullstorydev/grpcurl) packaged in `gcr.io/grpc-ecosystem/grpcurl-server`, but anything with reflection enabled is fine.

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
          image: kennethreitz/httpbin
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

> Replace this with your own gRPC server. The chart connects to it via the `connection.target` values.

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
  --set connection.mode=plaintext \
  --set connection.target.host=example-grpc-server.grpc-test.svc.cluster.local \
  --set connection.target.port=50051
```

Wait for both pods to become ready:

```bash
kubectl -n grpc-studio rollout status deploy/grpc-studio-backend
kubectl -n grpc-studio rollout status deploy/grpc-studio-frontend
```

## 5. Access the UI

Port-forward the frontend service:

```bash
kubectl -n grpc-studio port-forward svc/grpc-studio-grpc-studio-frontend 8080:80
```

Then open <http://localhost:8080>.

## 6. Verify

- The UI should load without "configuration not found" errors.
- The backend pod logs should show `gRPC Studio HTTP server started` and `clientMode: plaintext`.
- The frontend nginx logs should show successful proxy calls to `/api/grpc/*` and `/ws`.

```bash
kubectl -n grpc-studio logs deploy/grpc-studio-backend --tail=50
kubectl -n grpc-studio logs deploy/grpc-studio-frontend --tail=50
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ImagePullBackOff` | Forgot `eval $(minikube docker-env)` before building, or `pullPolicy` not set to `IfNotPresent`/`Never` |
| Backend pod `CrashLoopBackOff` with `client.target.host is required` | `connection.target.host` not set on the install command |
| Backend pod `CrashLoopBackOff` with CORS error | `backend.server.cors.origins` set to `["*"]` while credentials are enabled — leave it empty to use defaults |
| Frontend pod `CrashLoopBackOff` writing `/etc/nginx/nginx.conf` | Stale chart version — pull latest (the chart no longer mounts a custom nginx config) |
| UI loads but shows "Configuration file not found" | `frontend.yaml` ConfigMap not mounted — check `kubectl describe pod` for the frontend |

## Cleanup

```bash
helm -n grpc-studio uninstall grpc-studio
kubectl delete namespace grpc-studio grpc-test
minikube stop  # or `minikube delete` to wipe the cluster
```
