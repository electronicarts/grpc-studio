# Contributing to the gRPC Studio Helm Chart

## Repo layout

The Helm chart lives in `helm/` within the [grpc-studio](https://github.com/electronicarts/grpc-studio) monorepo.

```
helm/
├── Chart.yaml
├── values.yaml
├── templates/
├── application/
├── examples/
└── CONTRIBUTING.md   ← you are here
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) >= 1.33
- [Helm](https://helm.sh/docs/intro/install/) >= 3.10
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [chart-testing (ct)](https://github.com/helm/chart-testing#installation)

## Local development with Minikube

### 1. Start Minikube

```bash
minikube start --driver=docker
```

### 2. Build and load images

```bash
docker build -t grpc-studio-backend:dev -f docker/backend/Dockerfile .
docker build -t grpc-studio-frontend:dev -f docker/frontend/Dockerfile .

minikube image load grpc-studio-backend:dev
minikube image load grpc-studio-frontend:dev
```

### 3. Install the chart

```bash
helm install grpc-studio ./helm \
  --set backend.image.repository=grpc-studio-backend \
  --set backend.image.tag=dev \
  --set backend.image.pullPolicy=Never \
  --set frontend.image.repository=grpc-studio-frontend \
  --set frontend.image.tag=dev \
  --set frontend.image.pullPolicy=Never \
  --set connection.target.host=my-grpc-server.default.svc.cluster.local \
  --set connection.target.port=50051 \
  --set connection.mode=plaintext \
  --namespace grpc-studio --create-namespace
```

### 4. Access the UI

```bash
kubectl port-forward svc/grpc-studio-grpc-studio-frontend 8080:80 -n grpc-studio
```

Open http://localhost:8080.

### Iterating on the chart

After modifying templates, upgrade in place:

```bash
helm upgrade grpc-studio ./helm \
  --set backend.image.repository=grpc-studio-backend \
  --set backend.image.tag=dev \
  --set backend.image.pullPolicy=Never \
  --set frontend.image.repository=grpc-studio-frontend \
  --set frontend.image.tag=dev \
  --set frontend.image.pullPolicy=Never \
  -n grpc-studio
```

## Linting and testing

```bash
# Lint the chart
helm lint ./helm

# Render each example and eyeball the output
helm template grpc-studio ./helm -f helm/examples/basic/values.yaml
helm template grpc-studio ./helm -f helm/examples/nginx-ingress/values.yaml
helm template grpc-studio ./helm -f helm/examples/istio/values.yaml

# Full chart-testing lint (checks metadata, values schema, semver)
ct lint --config .github/ct.yaml
```

`ct install` (full cluster-based install test) runs automatically in CI.

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit on a PR must match:

```
<type>[optional scope]: <description>
```

| Type | When to use |
|---|---|
| `feat` | New feature or chart capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, dependency bumps |
| `refactor` | Code change with no behavior change |
| `test` | Adding or modifying tests |
| `ci` | Workflow / pipeline changes |

Breaking changes: add `!` after the type (`feat!:`) or include a `BREAKING CHANGE:` footer. This triggers a major version bump.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Make your changes with conventional commits.
3. Run `helm lint ./helm` and `ct lint --config .github/ct.yaml` locally before pushing.
4. Open a PR — CI will lint and template-test the chart automatically.
5. A maintainer will review and merge.

## Releases

Releases are fully automated via [release-please](https://github.com/googleapis/release-please).

When commits land on `main`:

1. release-please opens (or updates) a release PR with a generated `CHANGELOG.md` entry and bumped versions in `helm/Chart.yaml`.
2. Merging the release PR triggers the release workflow, which:
   - Creates a GitHub release and tag
   - Packages the Helm chart and pushes it to GHCR OCI

You do not need to manually tag, bump versions, or write changelog entries.
