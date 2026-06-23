# Frontend

SvelteKit application running on Bun. The frontend owns SSR, form actions, and narrow JSON routes for browser-only interactions.

## Prerequisites

- Bun 1.2 or newer
- pnpm version declared by the repository root
- backend running on port 3000 when refreshing the OpenAPI snapshot

The repository remains a pnpm workspace. Bun is currently the frontend runtime and test runner, not the monorepo package manager.

## Development

```bash
pnpm --dir apps/frontend start:dev
```

## Production build

```bash
pnpm --dir apps/frontend build
cd apps/frontend
bun run start:prod
```

The Bun adapter uses `HTTP_HOST` and `HTTP_PORT`. The frontend `Procfile` maps the platform-provided `PORT` to `HTTP_PORT`.

## Backend access

Generated backend SDK code is server-only. Routes, services, and queries should use `createBackendClient` from `src/lib/server/backend/client.ts`; browser components must not import generated backend code.

## Generated backend API

The committed OpenAPI snapshot is:

```text
openapi/backend.json
```

Refresh it from a running NestJS backend:

```bash
pnpm --dir apps/frontend api:schema:pull
```

Regenerate the server-only SDK:

```bash
pnpm --dir apps/frontend api:generate
```

Refresh both:

```bash
pnpm --dir apps/frontend api:refresh
```

Verify that generated files are current:

```bash
pnpm --dir apps/frontend api:check
```

Generated code must remain under `src/lib/server/backend/generated`.

## Infrastructure tests

```bash
pnpm --dir apps/frontend test:infra
```

## Environment

Copy `.env.example` to `.env` and adjust:

```dotenv
BACKEND_API_URL=http://127.0.0.1:3000
BACKEND_OPENAPI_URL=http://127.0.0.1:3000/docs-json
```

These values are private and must not use the `PUBLIC_` prefix.
