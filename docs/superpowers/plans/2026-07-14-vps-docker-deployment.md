# VPS Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Independently build and deploy the backend and frontend as Docker containers on a VPS from path-filtered GitHub Actions jobs running on a local self-hosted runner.

**Architecture:** Production multi-stage Dockerfiles build each application from the monorepo root and expose a healthcheck. The existing infrastructure Compose file gains independent backend/frontend services, while two native GitHub Actions workflows update only the selected service with `--no-deps` and wait for health.

**Tech Stack:** Docker Engine, Docker Compose v2, GitHub Actions self-hosted runner, Node.js 22, pnpm 10.12.1, Bun 1.3.14, NestJS 11, SvelteKit 2.

## Global Constraints

- A frontend-only change must not rebuild or restart backend, PostgreSQL, or NATS; the inverse applies to backend-only changes.
- Use no new application or CI dependency.
- Target GitHub runner labels `[self-hosted, linux, x64]`.
- Deploy automatically only from pushes to `main`; retain `workflow_dispatch` for explicit redeploys.
- Keep application secrets in VPS-owned files under `${CTE_ENV_DIR:-/opt/cte/env}` and never materialize or print them in GitHub Actions.
- Bind application ports to loopback by default: backend `127.0.0.1:3000`, frontend `127.0.0.1:5173`.
- Keep Docker images platform-neutral for a later GHCR/Kubernetes deployment layer.
- Do not add automatic database migrations, a registry, rollback orchestration, TLS, a reverse proxy, Helm, or Kubernetes manifests.

---

### Task 1: Build production application images

**Files:**
- Create: `.dockerignore`
- Create: `apps/backend/Dockerfile`
- Create: `apps/frontend/Dockerfile`
- Create: `apps/infra/deployment.test.ts`
- Modify: `apps/infra/package.json`

**Interfaces:**
- Consumes: root pnpm workspace, `backend`/`frontend` build scripts, backend port `3000`, frontend `HTTP_PORT=3000`.
- Produces: images `cte-backend:local` and `cte-frontend:local`, both with an HTTP healthcheck.

- [ ] **Step 1: Write the failing Docker deployment contract test**

Create `apps/infra/deployment.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const file = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('production Docker images', () => {
	for (const app of ['backend', 'frontend']) {
		it(`${app} has a multi-stage image with healthcheck`, () => {
			const path = `apps/${app}/Dockerfile`;

			expect(existsSync(resolve(root, path))).toBe(true);
			expect(file(path).match(/^FROM /gm)?.length ?? 0).toBeGreaterThanOrEqual(2);
			expect(file(path)).toContain('HEALTHCHECK');
		});
	}
});
```

Replace `apps/infra/package.json` with:

```json
{
  "name": "infra",
  "version": "1.0.0",
  "description": "",
  "license": "ISC",
  "author": "",
  "type": "commonjs",
  "main": "index.js",
  "scripts": {
    "start:dev": "docker compose up --build -d --wait",
    "test": "bun test deployment.test.ts"
  }
}
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter infra test
```

Expected: FAIL because `apps/backend/Dockerfile` and `apps/frontend/Dockerfile` do not exist.

- [ ] **Step 3: Add the minimum shared Docker context exclusions**

Create `.dockerignore`:

```dockerignore
.git
.github
.superpowers
**/.env
**/.env.*
!**/.env.example
**/node_modules
**/dist
**/build
**/.svelte-kit
**/.turbo
coverage
docs
apps/irc-bot
apps/stats
```

- [ ] **Step 4: Add the backend production Dockerfile**

Create `apps/backend/Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --filter backend... --frozen-lockfile

COPY apps/backend ./apps/backend

RUN pnpm --filter backend build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/docs-json').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "dist/src/main.js"]
```

- [ ] **Step 5: Add the frontend production Dockerfile**

Create `apps/frontend/Dockerfile`:

```dockerfile
FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY apps/frontend/package.json ./package.json

RUN bun install --no-save

COPY apps/frontend ./

RUN bun run build

FROM oven/bun:1.3.14 AS runtime

ENV NODE_ENV=production
ENV HTTP_HOST=0.0.0.0
ENV HTTP_PORT=3000

WORKDIR /app

COPY --from=build /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["bun", "build/index.js"]
```

- [ ] **Step 6: Run the contract and application build checks**

Run:

```bash
pnpm --filter infra test
pnpm --filter backend run build
pnpm --filter frontend run build
```

Expected: Docker contract passes 2/2 and both application builds exit 0.

- [ ] **Step 7: Build images when Docker is available**

Run:

```bash
docker build -f apps/backend/Dockerfile -t cte-backend:local .
docker build -f apps/frontend/Dockerfile -t cte-frontend:local .
```

Expected: both builds exit 0. If Docker is unavailable in the development environment, record this verification as environment-blocked and leave it for the self-hosted VPS runner.

- [ ] **Step 8: Commit the image boundary**

```bash
git add .dockerignore apps/backend/Dockerfile apps/frontend/Dockerfile apps/infra/deployment.test.ts apps/infra/package.json
git commit -m "build: add production application images"
```

---

### Task 2: Add independently deployable Compose services

**Files:**
- Modify: `apps/infra/deployment.test.ts`
- Modify: `apps/infra/docker-compose.yml`
- Modify: `apps/backend/.env.example`
- Modify: `apps/frontend/.env.example`

**Interfaces:**
- Consumes: Dockerfiles from Task 1 and VPS env directory `${CTE_ENV_DIR}`.
- Produces: Compose services named exactly `backend` and `frontend`; host port variables `BACKEND_PORT` and `FRONTEND_PORT`.

- [ ] **Step 1: Add failing Compose contract assertions**

Append inside `apps/infra/deployment.test.ts`:

```ts
describe('production Compose services', () => {
	const compose = file('apps/infra/docker-compose.yml');

	it('defines independently built backend and frontend services', () => {
		expect(compose).toContain('  backend:');
		expect(compose).toContain('dockerfile: apps/backend/Dockerfile');
		expect(compose).toContain('  frontend:');
		expect(compose).toContain('dockerfile: apps/frontend/Dockerfile');
	});

	it('loads VPS-owned env files and binds loopback ports', () => {
		expect(compose).toContain('${CTE_ENV_DIR:-/opt/cte/env}/backend.env');
		expect(compose).toContain('${CTE_ENV_DIR:-/opt/cte/env}/frontend.env');
		expect(compose).toContain('127.0.0.1:${BACKEND_PORT:-3000}:3000');
		expect(compose).toContain('127.0.0.1:${FRONTEND_PORT:-5173}:3000');
	});
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter infra test
```

Expected: FAIL because the Compose file has no `backend` or `frontend` service.

- [ ] **Step 3: Add backend and frontend Compose services**

Replace `apps/infra/docker-compose.yml` with:

```yaml
name: cte

services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: cte
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: postgres
    ports:
      - "5765:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./initdb:/docker-entrypoint-initdb.d
    networks:
      - cte-network

  nats:
    image: nats:2.10
    command: -js -m 8222 -sd /data/jetstream
    ports:
      - "${NATS_PORT:-4222}:4222"
      - "${NATS_MONITOR_PORT:-8222}:8222"
    volumes:
      - nats_data:/data/jetstream
    networks:
      - cte-network

  backend:
    image: cte-backend:local
    build:
      context: ../..
      dockerfile: apps/backend/Dockerfile
    restart: unless-stopped
    env_file:
      - ${CTE_ENV_DIR:-/opt/cte/env}/backend.env
    environment:
      PORT: 3000
    ports:
      - "127.0.0.1:${BACKEND_PORT:-3000}:3000"
    depends_on:
      - postgres
    networks:
      - cte-network

  frontend:
    image: cte-frontend:local
    build:
      context: ../..
      dockerfile: apps/frontend/Dockerfile
    restart: unless-stopped
    env_file:
      - ${CTE_ENV_DIR:-/opt/cte/env}/frontend.env
    environment:
      BACKEND_API_URL: http://backend:3000
      HTTP_HOST: 0.0.0.0
      HTTP_PORT: 3000
    ports:
      - "127.0.0.1:${FRONTEND_PORT:-5173}:3000"
    depends_on:
      - backend
    networks:
      - cte-network

volumes:
  postgres_data:
  nats_data:

networks:
  cte-network:
    name: cte-network
```

- [ ] **Step 4: Document container-facing example values**

Replace `apps/backend/.env.example` with:

```dotenv
DATABASE_URL="postgresql://cte:password@postgres:5432/cte_backend"

OSU_CLIENT_ID=
OSU_CLIENT_SECRET=
OSU_REDIRECT_URL=http://localhost:5173/auth/callback

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=86400

OSU_MATCH_SYNC_POLL_INTERVAL_MS=15000
OSU_MATCH_SYNC_LEASE_MS=60000
OSU_MATCH_SYNC_BATCH_SIZE=10
OSU_MATCH_SYNC_MAX_BACKOFF_MS=300000

NATS_HOST=nats
NATS_PORT=4222
# NATS_USER=
# NATS_PASSWORD=
```

Change `apps/frontend/.env.example` to:

```dotenv
BACKEND_API_URL=http://backend:3000
BACKEND_OPENAPI_URL=http://backend:3000/docs-json
```

- [ ] **Step 5: Run the contract test and validate Compose syntax**

Run:

```bash
pnpm --filter infra test
env_dir=$(mktemp -d)
touch "$env_dir/backend.env" "$env_dir/frontend.env"
CTE_ENV_DIR="$env_dir" docker compose -f apps/infra/docker-compose.yml config -q
```

Expected: contract passes 4/4 and Compose exits 0. If Docker is unavailable, the contract must pass and Compose validation is recorded as environment-blocked.

- [ ] **Step 6: Commit the runtime topology**

```bash
git add apps/infra/deployment.test.ts apps/infra/docker-compose.yml apps/backend/.env.example apps/frontend/.env.example
git commit -m "build: run applications with Compose"
```

---

### Task 3: Deploy services independently from GitHub Actions

**Files:**
- Modify: `apps/infra/deployment.test.ts`
- Create: `.github/workflows/deploy-backend.yml`
- Create: `.github/workflows/deploy-frontend.yml`

**Interfaces:**
- Consumes: Compose service names `backend` and `frontend` from Task 2.
- Produces: self-hosted production deployment workflows with independent native path filters and concurrency groups.

- [ ] **Step 1: Add failing workflow contract assertions**

Append inside `apps/infra/deployment.test.ts`:

```ts
describe('independent deployment workflows', () => {
	const backend = file('.github/workflows/deploy-backend.yml');
	const frontend = file('.github/workflows/deploy-frontend.yml');

	it('deploys only backend for backend paths', () => {
		expect(backend).toContain("- 'apps/backend/**'");
		expect(backend).not.toContain("- 'apps/frontend/**'");
		expect(backend).toContain('up -d --build --no-deps --wait --wait-timeout 120 backend');
	});

	it('deploys only frontend for frontend paths', () => {
		expect(frontend).toContain("- 'apps/frontend/**'");
		expect(frontend).not.toContain("- 'apps/backend/**'");
		expect(frontend).toContain('up -d --build --no-deps --wait --wait-timeout 120 frontend');
	});

	for (const workflow of [backend, frontend]) {
		it('targets the production self-hosted runner', () => {
			expect(workflow).toContain('runs-on: [self-hosted, linux, x64]');
			expect(workflow).toContain('CTE_ENV_DIR: /opt/cte/env');
		});
	}
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter infra test
```

Expected: FAIL because `.github/workflows/deploy-backend.yml` and `.github/workflows/deploy-frontend.yml` do not exist.

- [ ] **Step 3: Add the backend deployment workflow**

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy backend

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'packages/contracts/**'
      - 'patches/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
      - 'turbo.json'
      - '.dockerignore'
      - 'apps/infra/docker-compose.yml'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-backend-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: [self-hosted, linux, x64]
    timeout-minutes: 30
    env:
      CTE_ENV_DIR: /opt/cte/env
    steps:
      - uses: actions/checkout@v7
      - name: Build and deploy backend
        run: >-
          docker compose -f apps/infra/docker-compose.yml
          up -d --build --no-deps --wait --wait-timeout 120 backend
```

- [ ] **Step 4: Add the frontend deployment workflow**

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy frontend

on:
  push:
    branches: [main]
    paths:
      - 'apps/frontend/**'
      - 'packages/**'
      - 'patches/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
      - 'turbo.json'
      - '.dockerignore'
      - 'apps/infra/docker-compose.yml'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-frontend-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: [self-hosted, linux, x64]
    timeout-minutes: 30
    env:
      CTE_ENV_DIR: /opt/cte/env
    steps:
      - uses: actions/checkout@v7
      - name: Build and deploy frontend
        run: >-
          docker compose -f apps/infra/docker-compose.yml
          up -d --build --no-deps --wait --wait-timeout 120 frontend
```

- [ ] **Step 5: Run workflow contract and hygiene checks**

Run:

```bash
pnpm --filter infra test
git diff --check
```

Expected: deployment contract passes 8/8 and diff check exits 0.

- [ ] **Step 6: Commit the deployment automation**

```bash
git add apps/infra/deployment.test.ts .github/workflows/deploy-backend.yml .github/workflows/deploy-frontend.yml
git commit -m "ci: deploy applications independently"
```

---

### Task 4: Verify selective production deployment

**Files:**
- Verify only; modify the smallest responsible deployment file if a command exposes a defect.

**Interfaces:**
- Consumes: images, Compose services, and workflows from Tasks 1-3.
- Produces: a reproducible selective deployment handoff for the VPS runner.

- [ ] **Step 1: Run repository checks**

```bash
pnpm --filter infra test
pnpm --filter backend test -- --runInBand
pnpm --filter backend run build
pnpm --filter frontend run test:infra
pnpm --filter frontend run check
pnpm --filter frontend run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Validate and build the Docker deployment when Docker is available**

```bash
env_dir=$(mktemp -d)
touch "$env_dir/backend.env" "$env_dir/frontend.env"
CTE_ENV_DIR="$env_dir" docker compose -f apps/infra/docker-compose.yml config -q
docker build -f apps/backend/Dockerfile -t cte-backend:local .
docker build -f apps/frontend/Dockerfile -t cte-frontend:local .
```

Expected: all commands exit 0. On the current WSL environment, record these checks as environment-blocked if Docker remains unavailable.

- [ ] **Step 3: Exercise the selective rollout on the VPS**

After `/opt/cte/env/backend.env` and `/opt/cte/env/frontend.env` exist and PostgreSQL/NATS have been provisioned, run:

```bash
docker compose -f apps/infra/docker-compose.yml up -d postgres nats
docker compose -f apps/infra/docker-compose.yml up -d --build --no-deps --wait --wait-timeout 120 backend
docker compose -f apps/infra/docker-compose.yml ps --format json > /tmp/cte-before-frontend.json
docker compose -f apps/infra/docker-compose.yml up -d --build --no-deps --wait --wait-timeout 120 frontend
docker compose -f apps/infra/docker-compose.yml ps
```

Expected: backend and frontend are healthy; PostgreSQL/NATS remain running; the frontend rollout does not recreate backend or infrastructure containers.

- [ ] **Step 4: Check final diff scope**

```bash
git diff --check
git status --short
```

Expected: only intentional deployment files and pre-existing user-owned `.superpowers` artifacts appear.
