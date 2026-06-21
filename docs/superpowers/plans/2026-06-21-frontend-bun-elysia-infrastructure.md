# Frontend Bun, Elysia BFF, and Generated API Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare `apps/frontend` to run on Bun, host an Elysia BFF with an Eden client, and consume a generated NestJS API client without migrating authentication or existing business features yet.

**Architecture:** SvelteKit remains the public web server and owns SSR, routes, and future form actions. An Elysia application lives under `apps/frontend/src/lib/server/bff`, is exposed through a SvelteKit catch-all route at `/bff/*`, and is callable in-process through Eden from server-only code. The NestJS OpenAPI document is snapshotted inside `apps/frontend/openapi`, and Orval generates a server-only fetch SDK inside `apps/frontend/src/lib/server/backend/generated`.

**Tech Stack:** Bun runtime and test runner, SvelteKit 2, Svelte 5, `@eslym/sveltekit-adapter-bun`, Elysia, Eden Treaty, NestJS OpenAPI, Orval, TypeScript.

---

## Scope

This phase includes:

- running the built SvelteKit frontend on Bun;
- adding an Elysia BFF inside `apps/frontend`;
- exposing one typed `GET /bff/health` endpoint;
- adding an in-process Eden client for server-only callers;
- snapshotting the existing NestJS OpenAPI schema;
- generating a server-only NestJS SDK with Orval;
- adding infrastructure tests and repeatable verification commands;
- documenting local development and regeneration workflows.

This phase explicitly does not include:

- changing the existing OAuth/JWT implementation;
- moving existing frontend API calls to the generated SDK;
- exposing Eden directly to browser components;
- moving tournament, stage, mappool, user, or osu logic into Elysia;
- converting the entire monorepo from pnpm to Bun package management;
- adding Redis, a session database, queues, WebSockets, or service discovery;
- performing the FSD migration.

## Locked Decisions

1. All new BFF and generated API code stays inside `apps/frontend`.
2. Server-only code lives under `$lib/server`; SvelteKit must reject browser imports.
3. The BFF is initially hosted by SvelteKit, not deployed as a second process.
4. Eden uses the Elysia application instance directly for server-to-BFF calls, avoiding an unnecessary loopback HTTP request.
5. `/bff/*` remains available over HTTP for smoke testing and future browser-to-BFF calls, but this phase adds no browser consumer.
6. The root pnpm workspace and root `pnpm-lock.yaml` remain authoritative. Bun is introduced as the frontend runtime and test runner only.
7. `apps/frontend/package-lock.json` and `apps/frontend/pnpm-lock.yaml` are removed because nested lockfiles conflict with the root workspace.
8. Generated files and the OpenAPI snapshot are committed so builds do not require a live backend.
9. The generated SDK uses the private `BACKEND_API_URL`; `PUBLIC_API_URL` is not used by new server-only infrastructure.

## Target File Structure

```text
apps/frontend/
├── openapi/
│   └── backend.json
├── scripts/
│   └── pull-openapi.ts
├── src/
│   ├── lib/
│   │   └── server/
│   │       ├── backend/
│   │       │   ├── fetcher.ts
│   │       │   └── generated/
│   │       │       ├── model/
│   │       │       └── *.ts
│   │       └── bff/
│   │           ├── app.test.ts
│   │           ├── app.ts
│   │           ├── client.test.ts
│   │           └── client.ts
│   └── routes/
│       └── bff/
│           └── [...path]/
│               └── +server.ts
├── .env.example
├── orval.config.ts
├── package.json
├── Procfile
└── svelte.config.js
```

## Task 1: Establish a Reproducible Baseline

**Files:**

- Inspect: `apps/frontend/package.json`
- Inspect: `apps/frontend/svelte.config.js`
- Inspect: `apps/frontend/Procfile`
- Inspect: `apps/frontend/package-lock.json`
- Inspect: `apps/frontend/pnpm-lock.yaml`
- Inspect: `pnpm-lock.yaml`
- Create: `docs/superpowers/plans/evidence/frontend-infra-baseline.txt`

- [ ] **Step 1: Record the existing frontend dependency state**

Run:

```bash
pnpm --dir apps/frontend list --depth 0
```

Expected: the output lists SvelteKit, Svelte, adapter-node, and the current frontend dependencies.

- [ ] **Step 2: Record the existing type-check failures**

Run:

```bash
pnpm --dir apps/frontend check
```

Expected: command exits non-zero with the two known errors:

```text
src/lib/components/ui/button/button.svelte
src/lib/components/ui/select/select-content.svelte
```

Do not fix these unrelated existing UI errors in this infrastructure phase.

- [ ] **Step 3: Record the existing lint failure**

Run:

```bash
pnpm --dir apps/frontend lint
```

Expected: command exits non-zero because the current Prettier/Svelte toolchain throws `getVisitorKeys is not a function`.

Do not claim that the infrastructure introduced these failures.

- [ ] **Step 4: Save the baseline evidence**

Create `docs/superpowers/plans/evidence/frontend-infra-baseline.txt` with:

```text
Frontend infrastructure baseline

Known pre-existing check failures:
- src/lib/components/ui/button/button.svelte: incompatible class value type
- src/lib/components/ui/select/select-content.svelte: missing flyAndScale export

Known pre-existing lint failure:
- prettier-plugin-svelte crashes with "getVisitorKeys is not a function"

Infrastructure acceptance commands must run separately from the existing full check/lint gates until those issues are repaired.
```

- [ ] **Step 5: Commit the baseline record**

```bash
git add docs/superpowers/plans/evidence/frontend-infra-baseline.txt
git commit -m "docs(frontend): record infrastructure baseline"
```

## Task 2: Introduce Bun as the Frontend Runtime

**Files:**

- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/svelte.config.js`
- Modify: `apps/frontend/Procfile`
- Delete: `apps/frontend/package-lock.json`
- Delete: `apps/frontend/pnpm-lock.yaml`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install the Bun adapter and Bun test types through the root workspace**

Run:

```bash
pnpm --filter frontend remove @sveltejs/adapter-node
pnpm --filter frontend add -D @eslym/sveltekit-adapter-bun @types/bun
```

Expected: only the root `pnpm-lock.yaml` is updated; no nested lockfile is created.

- [ ] **Step 2: Replace the SvelteKit adapter**

Replace `apps/frontend/svelte.config.js` with:

```js
import adapter from '@eslym/sveltekit-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			out: 'build',
			bundler: 'bun',
			serveStatic: true,
			sourceMap: true
		}),
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
```

The deprecated CSRF setting is intentionally preserved in this task to keep the change infrastructure-only. Its removal belongs to the authentication/security phase and must remain visible as a known risk.

- [ ] **Step 3: Update frontend scripts**

Change the `scripts` section of `apps/frontend/package.json` to:

```json
{
	"start:dev": "vite dev",
	"build": "svelte-kit sync && vite build",
	"start:prod": "bun ./build/index.js",
	"preview": "vite preview",
	"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
	"check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
	"lint": "prettier --check . && eslint .",
	"format": "prettier --write .",
	"test:infra": "bun test src/lib/server",
	"api:schema:pull": "bun ./scripts/pull-openapi.ts",
	"api:generate": "orval --config ./orval.config.ts",
	"api:refresh": "bun run api:schema:pull && bun run api:generate",
	"api:check": "bun run api:generate && git diff --exit-code -- openapi/backend.json src/lib/server/backend/generated"
}
```

Add:

```json
{
	"engines": {
		"bun": ">=1.2.0"
	}
}
```

Do not add a package-level `packageManager` field because the root workspace remains pnpm-managed.

- [ ] **Step 4: Update the production command**

Replace `apps/frontend/Procfile` with:

```text
web: cd apps/frontend && bun run start:prod
```

- [ ] **Step 5: Remove conflicting nested lockfiles**

Run:

```bash
rm apps/frontend/package-lock.json apps/frontend/pnpm-lock.yaml
```

Expected: the root `pnpm-lock.yaml` remains the only dependency lockfile.

- [ ] **Step 6: Build with the Bun adapter**

Run:

```bash
pnpm --dir apps/frontend build
```

Expected: exit code `0` and `apps/frontend/build/index.js` exists.

- [ ] **Step 7: Smoke-test the built Bun server**

Run in one terminal:

```bash
cd apps/frontend
HTTP_PORT=4173 bun run start:prod
```

Run in another terminal:

```bash
curl -fsS http://127.0.0.1:4173/
```

Expected: HTTP `200` and frontend HTML.

- [ ] **Step 8: Commit the Bun runtime migration**

```bash
git add apps/frontend/package.json apps/frontend/svelte.config.js apps/frontend/Procfile pnpm-lock.yaml
git add -u apps/frontend/package-lock.json apps/frontend/pnpm-lock.yaml
git commit -m "build(frontend): run SvelteKit on Bun"
```

## Task 3: Add the Minimal Elysia BFF

**Files:**

- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/frontend/src/lib/server/bff/app.ts`
- Create: `apps/frontend/src/lib/server/bff/app.test.ts`

- [ ] **Step 1: Install Elysia and Eden**

Run:

```bash
pnpm --filter frontend add elysia @elysiajs/eden
```

Expected: dependencies are added to `apps/frontend/package.json` and the root lockfile.

- [ ] **Step 2: Write a failing BFF health test**

Create `apps/frontend/src/lib/server/bff/app.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { bffApp } from './app';

describe('bffApp', () => {
	it('returns typed health information', async () => {
		const response = await bffApp.handle(new Request('http://localhost/bff/health'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});

	it('returns 404 for an unknown route', async () => {
		const response = await bffApp.handle(new Request('http://localhost/bff/missing'));

		expect(response.status).toBe(404);
	});
});
```

- [ ] **Step 3: Run the BFF test and verify that it fails**

Run:

```bash
pnpm --dir apps/frontend test:infra -- src/lib/server/bff/app.test.ts
```

Expected: failure because `./app` does not exist.

- [ ] **Step 4: Implement the minimal BFF application**

Create `apps/frontend/src/lib/server/bff/app.ts`:

```ts
import { Elysia, t } from 'elysia';

export const bffApp = new Elysia({
	name: 'frontend-bff',
	prefix: '/bff'
}).get(
	'/health',
	() => ({
		status: 'ok' as const,
		service: 'frontend-bff' as const
	}),
	{
		response: {
			200: t.Object({
				status: t.Literal('ok'),
				service: t.Literal('frontend-bff')
			})
		}
	}
);

export type BffApp = typeof bffApp;
```

- [ ] **Step 5: Run the BFF unit test**

Run:

```bash
pnpm --dir apps/frontend test:infra -- src/lib/server/bff/app.test.ts
```

Expected: `2 pass`, `0 fail`.

- [ ] **Step 6: Commit the Elysia application**

```bash
git add apps/frontend/package.json apps/frontend/src/lib/server/bff/app.ts apps/frontend/src/lib/server/bff/app.test.ts pnpm-lock.yaml
git commit -m "feat(frontend): add minimal Elysia BFF"
```

## Task 4: Expose Elysia Through SvelteKit

**Files:**

- Create: `apps/frontend/src/routes/bff/[...path]/+server.ts`
- Create: `apps/frontend/src/lib/server/bff/http-handler.ts`
- Create: `apps/frontend/src/lib/server/bff/http-handler.test.ts`

- [ ] **Step 1: Write the failing HTTP handler test**

Create `apps/frontend/src/lib/server/bff/http-handler.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { handleBffRequest } from './http-handler';

describe('handleBffRequest', () => {
	it('delegates the request to Elysia', async () => {
		const response = await handleBffRequest(new Request('http://localhost/bff/health'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});
});
```

- [ ] **Step 2: Run the HTTP handler test and verify that it fails**

Run:

```bash
pnpm --dir apps/frontend test:infra -- src/lib/server/bff/http-handler.test.ts
```

Expected: failure because `./http-handler` does not exist.

- [ ] **Step 3: Implement the reusable HTTP handler**

Create `apps/frontend/src/lib/server/bff/http-handler.ts`:

```ts
import { bffApp } from './app';

export const handleBffRequest = (request: Request): Promise<Response> | Response => {
	return bffApp.handle(request);
};
```

- [ ] **Step 4: Add the SvelteKit catch-all route**

Create `apps/frontend/src/routes/bff/[...path]/+server.ts`:

```ts
import { handleBffRequest } from '$lib/server/bff/http-handler';
import type { RequestHandler } from './$types';

const handle: RequestHandler = ({ request }) => handleBffRequest(request);

export {
	handle as DELETE,
	handle as GET,
	handle as OPTIONS,
	handle as PATCH,
	handle as POST,
	handle as PUT
};
```

- [ ] **Step 5: Run all BFF infrastructure tests**

Run:

```bash
pnpm --dir apps/frontend test:infra
```

Expected: all tests under `src/lib/server` pass.

- [ ] **Step 6: Build and smoke-test the HTTP route**

Run:

```bash
pnpm --dir apps/frontend build
```

Start:

```bash
cd apps/frontend
HTTP_PORT=4173 bun run start:prod
```

Verify:

```bash
curl -fsS http://127.0.0.1:4173/bff/health
```

Expected:

```json
{"status":"ok","service":"frontend-bff"}
```

- [ ] **Step 7: Commit the SvelteKit bridge**

```bash
git add apps/frontend/src/lib/server/bff/http-handler.ts apps/frontend/src/lib/server/bff/http-handler.test.ts 'apps/frontend/src/routes/bff/[...path]/+server.ts'
git commit -m "feat(frontend): expose BFF through SvelteKit"
```

## Task 5: Add the Server-Only Eden Client

**Files:**

- Create: `apps/frontend/src/lib/server/bff/client.ts`
- Create: `apps/frontend/src/lib/server/bff/client.test.ts`

- [ ] **Step 1: Write the failing Eden test**

Create `apps/frontend/src/lib/server/bff/client.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { bff } from './client';

describe('server-only Eden client', () => {
	it('calls the Elysia app in-process', async () => {
		const { data, error, status } = await bff.bff.health.get();

		expect(error).toBeNull();
		expect(status).toBe(200);
		expect(data).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});
});
```

- [ ] **Step 2: Run the Eden test and verify that it fails**

Run:

```bash
pnpm --dir apps/frontend test:infra -- src/lib/server/bff/client.test.ts
```

Expected: failure because `./client` does not exist.

- [ ] **Step 3: Implement the in-process Eden client**

Create `apps/frontend/src/lib/server/bff/client.ts`:

```ts
import { treaty } from '@elysiajs/eden';
import { bffApp } from './app';

export const bff = treaty(bffApp);
```

Do not export this module from `src/lib/index.ts`. Its `$lib/server` location is the browser-import boundary.

- [ ] **Step 4: Run the Eden test**

Run:

```bash
pnpm --dir apps/frontend test:infra -- src/lib/server/bff/client.test.ts
```

Expected: `1 pass`, `0 fail`.

- [ ] **Step 5: Run all infrastructure tests**

Run:

```bash
pnpm --dir apps/frontend test:infra
```

Expected: all BFF application, bridge, and Eden tests pass.

- [ ] **Step 6: Commit the Eden client**

```bash
git add apps/frontend/src/lib/server/bff/client.ts apps/frontend/src/lib/server/bff/client.test.ts
git commit -m "feat(frontend): add server-only Eden client"
```

## Task 6: Add the NestJS OpenAPI Snapshot Pipeline

**Files:**

- Create: `apps/frontend/scripts/pull-openapi.ts`
- Create: `apps/frontend/openapi/backend.json`
- Create: `apps/frontend/.env.example`
- Modify: `apps/frontend/.gitignore`

- [ ] **Step 1: Write the OpenAPI pull script**

Create `apps/frontend/scripts/pull-openapi.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const openApiUrl = process.env.BACKEND_OPENAPI_URL ?? 'http://127.0.0.1:3000/docs-json';
const outputPath = resolve(import.meta.dir, '../openapi/backend.json');

const response = await fetch(openApiUrl, {
	headers: {
		accept: 'application/json'
	}
});

if (!response.ok) {
	throw new Error(`Unable to fetch OpenAPI schema: ${response.status} ${response.statusText}`);
}

const schema = await response.json();
const serialized = `${JSON.stringify(schema, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized, 'utf8');

console.info(`OpenAPI schema written to ${outputPath}`);
```

- [ ] **Step 2: Document private infrastructure variables**

Create `apps/frontend/.env.example`:

```dotenv
BACKEND_API_URL=http://127.0.0.1:3000
BACKEND_OPENAPI_URL=http://127.0.0.1:3000/docs-json
```

Do not prefix either variable with `PUBLIC_`; both are server/build-time infrastructure settings.

- [ ] **Step 3: Ensure the snapshot is tracked**

Confirm `apps/frontend/.gitignore` does not ignore `openapi/backend.json`. No ignore rule should be added for `openapi/` or `generated/`.

- [ ] **Step 4: Start the existing NestJS backend**

Run in a separate terminal:

```bash
pnpm --filter backend start:dev
```

Expected: backend listens on `http://127.0.0.1:3000`.

- [ ] **Step 5: Verify the Swagger JSON endpoint**

Run:

```bash
curl -fsS http://127.0.0.1:3000/docs-json
```

Expected: JSON with top-level `openapi`, `paths`, and `components`.

- [ ] **Step 6: Pull and validate the schema snapshot**

Run:

```bash
pnpm --dir apps/frontend api:schema:pull
bun -e "const schema = await Bun.file('apps/frontend/openapi/backend.json').json(); if (!schema.openapi || !schema.paths) process.exit(1)"
```

Expected: both commands exit `0`.

- [ ] **Step 7: Commit the snapshot pipeline**

```bash
git add apps/frontend/scripts/pull-openapi.ts apps/frontend/openapi/backend.json apps/frontend/.env.example apps/frontend/.gitignore
git commit -m "build(frontend): snapshot backend OpenAPI schema"
```

## Task 7: Generate the Server-Only NestJS SDK

**Files:**

- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/frontend/orval.config.ts`
- Create: `apps/frontend/src/lib/server/backend/fetcher.ts`
- Generate: `apps/frontend/src/lib/server/backend/generated/**`

- [ ] **Step 1: Install Orval**

Run:

```bash
pnpm --filter frontend add -D orval
```

Expected: Orval is recorded in `apps/frontend/package.json` and the root lockfile.

- [ ] **Step 2: Add the server-only fetch mutator**

Create `apps/frontend/src/lib/server/backend/fetcher.ts`:

```ts
import { env } from '$env/dynamic/private';

export type BackendRequestError = {
	status: number;
	message: string;
	body: unknown;
};

export async function backendFetch<T>(path: string, init: RequestInit): Promise<T> {
	const baseUrl = env.BACKEND_API_URL;

	if (!baseUrl) {
		throw new Error('BACKEND_API_URL is not set');
	}

	const response = await fetch(new URL(path, baseUrl), init);
	const contentType = response.headers.get('content-type') ?? '';
	const body = contentType.includes('application/json') ? await response.json() : await response.text();

	if (!response.ok) {
		throw {
			status: response.status,
			message:
				typeof body === 'object' &&
				body !== null &&
				'message' in body &&
				typeof body.message === 'string'
					? body.message
					: response.statusText || 'Backend request failed',
			body
		} satisfies BackendRequestError;
	}

	return body as T;
}
```

This mutator deliberately has no authentication logic in this phase. The later auth phase will introduce a request-scoped server client instead of reading tokens from browser-visible data.

- [ ] **Step 3: Add the Orval configuration**

Create `apps/frontend/orval.config.ts`:

```ts
import { defineConfig } from 'orval';

export default defineConfig({
	backend: {
		input: {
			target: './openapi/backend.json'
		},
		output: {
			mode: 'split',
			target: './src/lib/server/backend/generated/endpoints.ts',
			schemas: './src/lib/server/backend/generated/model',
			client: 'fetch',
			clean: true,
			prettier: true,
			override: {
				mutator: {
					path: './src/lib/server/backend/fetcher.ts',
					name: 'backendFetch'
				}
			}
		}
	}
});
```

- [ ] **Step 4: Generate the SDK**

Run:

```bash
pnpm --dir apps/frontend api:generate
```

Expected:

- generated endpoint files exist under `src/lib/server/backend/generated`;
- generated model files exist under `src/lib/server/backend/generated/model`;
- generated imports reference `../fetcher` or the correct Orval-calculated relative path;
- no generated file imports `$env/dynamic/public`;
- no generated file is placed outside `$lib/server`.

- [ ] **Step 5: Verify that generated types represent HTTP dates as strings**

Run:

```bash
rg -n "startsAt|createdAt|updatedAt" apps/frontend/src/lib/server/backend/generated/model
```

Expected: generated API response fields use `string`, not `Date`.

- [ ] **Step 6: Verify deterministic offline generation**

Run:

```bash
pnpm --dir apps/frontend api:generate
git diff --exit-code -- apps/frontend/openapi/backend.json apps/frontend/src/lib/server/backend/generated
```

Expected: second generation produces no diff.

- [ ] **Step 7: Commit generated API infrastructure**

```bash
git add apps/frontend/package.json apps/frontend/orval.config.ts apps/frontend/src/lib/server/backend/fetcher.ts apps/frontend/src/lib/server/backend/generated pnpm-lock.yaml
git commit -m "build(frontend): generate server-only backend SDK"
```

## Task 8: Add Contract and Boundary Tests

**Files:**

- Create: `apps/frontend/src/lib/server/backend/generated-api.test.ts`
- Create: `apps/frontend/src/lib/server/server-boundaries.test.ts`

- [ ] **Step 1: Add a generated-contract smoke test**

Create `apps/frontend/src/lib/server/backend/generated-api.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import * as generatedApi from './generated/endpoints';

describe('generated backend API', () => {
	it('exports generated endpoint modules', () => {
		expect(Object.keys(generatedApi).length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Add a server-boundary test**

Create `apps/frontend/src/lib/server/server-boundaries.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function collectFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const path = resolve(directory, entry.name);
			return entry.isDirectory() ? collectFiles(path) : [path];
		})
	);

	return nested.flat();
}

describe('server-only infrastructure boundaries', () => {
	it('keeps generated and BFF code under src/lib/server', async () => {
		const serverRoot = resolve(import.meta.dir);
		const files = await collectFiles(serverRoot);

		expect(files.some((file) => file.includes('/backend/generated/'))).toBe(true);
		expect(files.some((file) => file.includes('/bff/'))).toBe(true);
		expect(files.every((file) => file.startsWith(serverRoot))).toBe(true);
	});
});
```

- [ ] **Step 3: Run all infrastructure tests**

Run:

```bash
pnpm --dir apps/frontend test:infra
```

Expected: all tests pass with `0 fail`.

- [ ] **Step 4: Run the generated-code freshness check**

Run:

```bash
pnpm --dir apps/frontend api:check
```

Expected: exit code `0` and no diff.

- [ ] **Step 5: Commit the boundary tests**

```bash
git add apps/frontend/src/lib/server/backend/generated-api.test.ts apps/frontend/src/lib/server/server-boundaries.test.ts
git commit -m "test(frontend): verify BFF and generated API boundaries"
```

## Task 9: Document the Infrastructure Workflow

**Files:**

- Modify: `apps/frontend/README.md`

- [ ] **Step 1: Replace the generated create-svelte README**

Replace `apps/frontend/README.md` with:

```markdown
# Frontend

SvelteKit application running on Bun. The frontend owns SSR and exposes an embedded Elysia BFF at `/bff/*`.

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

The Bun adapter uses `HTTP_HOST` and `HTTP_PORT`.

## BFF

The Elysia application is defined in:

```text
src/lib/server/bff/app.ts
```

It is exposed by SvelteKit under:

```text
/bff/*
```

Server-side code uses the in-process Eden client:

```ts
import { bff } from '$lib/server/bff/client';

const { data, error } = await bff.bff.health.get();
```

Do not import the BFF or Eden client into browser components.

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
```

- [ ] **Step 2: Commit the documentation**

```bash
git add apps/frontend/README.md
git commit -m "docs(frontend): document Bun BFF infrastructure"
```

## Task 10: Final Verification

**Files:**

- Verify: `apps/frontend/**`
- Verify: `pnpm-lock.yaml`

- [ ] **Step 1: Confirm lockfile policy**

Run:

```bash
find apps/frontend -maxdepth 1 -type f \( -name 'package-lock.json' -o -name 'pnpm-lock.yaml' -o -name 'bun.lock' -o -name 'bun.lockb' \) -print
```

Expected: no output.

- [ ] **Step 2: Run infrastructure tests**

Run:

```bash
pnpm --dir apps/frontend test:infra
```

Expected: all tests pass with `0 fail`.

- [ ] **Step 3: Verify generated-code freshness**

Run:

```bash
pnpm --dir apps/frontend api:check
```

Expected: exit code `0`.

- [ ] **Step 4: Build the frontend**

Run:

```bash
pnpm --dir apps/frontend build
```

Expected: exit code `0` and `apps/frontend/build/index.js` exists.

- [ ] **Step 5: Run the production smoke test**

Start:

```bash
cd apps/frontend
HTTP_PORT=4173 bun run start:prod
```

Verify:

```bash
curl -fsS http://127.0.0.1:4173/bff/health
curl -fsS http://127.0.0.1:4173/
```

Expected:

- `/bff/health` returns `{"status":"ok","service":"frontend-bff"}`;
- `/` returns frontend HTML.

- [ ] **Step 6: Re-run the known failing broad checks**

Run:

```bash
pnpm --dir apps/frontend check
pnpm --dir apps/frontend lint
```

Expected at this phase:

- `check` may still report only the two baseline UI errors;
- `lint` may still report the baseline Prettier/Svelte crash;
- no new infrastructure file should add another diagnostic before those baseline failures.

If either command reports a new error in `src/lib/server`, `src/routes/bff`, `orval.config.ts`, or `scripts/pull-openapi.ts`, fix it before completing the phase.

- [ ] **Step 7: Inspect the final diff**

Run:

```bash
git status --short
git log -10 --oneline --stat -- apps/frontend docs/superpowers/plans
```

Expected:

- existing unrelated backend changes remain untouched;
- frontend infrastructure changes match this plan;
- no secrets or local `.env` files are tracked;
- no generated code exists outside `apps/frontend/src/lib/server/backend/generated`.

## Acceptance Criteria

The infrastructure phase is complete only when:

1. SvelteKit builds with `@eslym/sveltekit-adapter-bun`.
2. The production frontend starts with Bun.
3. `GET /bff/health` works through the built SvelteKit server.
4. Eden calls the same Elysia application in-process from `$lib/server`.
5. The NestJS OpenAPI snapshot is committed under `apps/frontend/openapi`.
6. Orval deterministically generates a server-only SDK.
7. `test:infra`, `api:check`, and `build` pass.
8. Existing frontend API code remains operational and unchanged.
9. Existing auth behavior remains unchanged and is explicitly deferred.
10. The only lockfile used for dependencies is the root `pnpm-lock.yaml`.

## Follow-up Plan Boundary

After this phase, create a separate implementation plan for authentication. That plan should:

- remove the JWT from serialized SvelteKit page data;
- restore SvelteKit CSRF origin checks;
- implement OAuth `state`;
- use secure HttpOnly cookies;
- add logout and expired-session cleanup;
- introduce request-scoped backend authorization in `$lib/server/backend`;
- migrate authenticated mutations from browser API calls to SvelteKit actions or Elysia BFF endpoints.
