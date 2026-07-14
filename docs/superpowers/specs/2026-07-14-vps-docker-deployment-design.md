# VPS Docker Deployment Design

## Goal

Deploy the backend and frontend independently on a VPS from GitHub Actions running on a self-hosted runner on that VPS. A change to one application must not rebuild or restart the other application or the PostgreSQL/NATS infrastructure.

## Runtime shape

- Add production multi-stage Dockerfiles for `apps/backend` and `apps/frontend` using the repository root as build context.
- Extend `apps/infra/docker-compose.yml` with `backend` and `frontend` services while retaining the existing PostgreSQL and NATS services.
- Give each application service its own image name and healthcheck.
- Bind configurable host ports to loopback by default: backend `127.0.0.1:3000`, frontend `127.0.0.1:5173`. A reverse proxy can be added later without changing the images.
- Configure frontend-to-backend traffic through the Compose network with `BACKEND_API_URL=http://backend:3000`.
- Load secrets and production settings from untracked env files already present on the VPS. GitHub Actions will not create, print, or own application secrets.

PostgreSQL and NATS are provisioned once with Compose and remain running during application deployments. Database migration execution is outside this first deployment increment and remains an explicit operator step.

## Workflows

Create two workflows targeting `[self-hosted, linux, x64]`:

1. `deploy-backend.yml` runs on pushes to `main` affecting backend code, shared contracts, workspace configuration, or the backend deployment files.
2. `deploy-frontend.yml` runs on pushes to `main` affecting frontend code, workspace configuration, or the frontend deployment files.

Both also support `workflow_dispatch`.

Each workflow checks out the exact commit and runs only:

```sh
docker compose -f apps/infra/docker-compose.yml up -d --build --no-deps --wait <service>
```

Per-service concurrency groups serialize deployments and cancel an obsolete queued/running deployment for the same service. Backend and frontend deployments may run independently.

Changes to `pnpm-lock.yaml`, root workspace/build configuration, the shared Docker ignore file, or Compose configuration trigger both workflows because they can affect both images.

## Failure behavior

- Docker multi-stage builds fail before replacing a running container when compilation fails.
- Compose waits for the selected service healthcheck and returns a failing exit code if the replacement is unhealthy.
- The other application and infrastructure services are excluded with `--no-deps` and are not restarted.
- Automatic rollback, container registry publishing, database migrations, TLS, and reverse-proxy configuration are intentionally deferred.

## Kubernetes migration path

The application images stay platform-neutral: runtime configuration is environment-only, application data is external, and Compose contains no application build logic beyond selecting the Dockerfiles. A later Kubernetes migration replaces the deployment layer with GHCR publishing and Kubernetes manifests or Helm. The Dockerfiles and application configuration contract remain unchanged. Database storage migration is a separate concern.

## Verification

- Build both production images from a clean checkout.
- Validate Compose configuration without starting services.
- Verify backend-only and frontend-only path filters and service commands by inspection.
- Start each application service against provisioned infrastructure and confirm its healthcheck passes.
- Confirm a backend-only deployment does not recreate frontend, PostgreSQL, or NATS, and vice versa.
