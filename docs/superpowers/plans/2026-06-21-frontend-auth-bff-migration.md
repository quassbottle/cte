# Frontend Server Authentication Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move browser authentication and authenticated requests behind the SvelteKit server boundary, remove JWTs from browser-visible data, and fix the stale unauthenticated UI after OAuth callback.

**Architecture:** NestJS remains responsible for osu! code exchange, user creation, JWT issuance, JWT validation, and authorization policies. SvelteKit owns browser OAuth redirects, state validation, HttpOnly cookies, logout, and server actions. SvelteKit hooks resolve the current user through NestJS and expose only a safe viewer to pages.

**Tech Stack:** Bun, SvelteKit 2, Orval-generated NestJS client, TypeScript.

---

### Task 1: SvelteKit OAuth endpoints

**Files:**
- Create: `apps/frontend/src/routes/auth/login/+server.ts`
- Create: `apps/frontend/src/routes/auth/callback/+server.ts`
- Create: `apps/frontend/src/routes/auth/logout/+server.ts`
- Create: `apps/frontend/src/lib/server/auth/cookies.ts`

- [x] Add failing tests for login redirect, OAuth state cookie, callback state validation, session cookie, and logout.
- [x] Add `/auth/login`, `/auth/callback`, and `/auth/logout`.
- [x] Verify callback returns a new HTTP 303 after setting the cookie, preventing stale layout data reuse.

### Task 2: Server-only session resolution

**Files:**
- Modify: `apps/frontend/src/hooks.server.ts`
- Modify: `apps/frontend/src/app.d.ts`
- Modify: `apps/frontend/src/routes/+layout.server.ts`
- Modify: `apps/frontend/src/routes/+page.server.ts`
- Delete: `apps/frontend/src/lib/api/auth.ts`
- Create: `apps/frontend/src/lib/server/auth/session.ts`
- Create: `apps/frontend/src/lib/server/auth/session.test.ts`

- [x] Resolve the current user from the session cookie through backend `/users/me`.
- [x] Delete invalid/expired cookies after backend `401`.
- [x] Keep JWT only in `event.locals`.
- [x] Return only a safe user/viewer from layout loads.
- [x] Assert serialized page data never contains `token`.

### Task 3: Login/logout UI and CSRF

**Files:**
- Modify: `apps/frontend/src/lib/components/header/authContainer.svelte`
- Modify: `apps/frontend/svelte.config.js`
- Modify: `apps/backend/.env.example`
- Modify: `apps/frontend/.env.example`

- [x] Replace browser-built OAuth URL with `/auth/login`.
- [x] Add same-origin POST logout form.
- [x] Remove disabled CSRF origin checking.
- [x] Point backend `OSU_REDIRECT_URL` example to `/auth/callback`.
- [x] Remove obsolete frontend OAuth/JWT variables.

### Task 4: Authenticated mutations behind SvelteKit server actions

**Files:**
- Modify: `apps/frontend/src/routes/events/create/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/create/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/*.svelte`

- [x] Move normal HTML forms to SvelteKit server actions.
- [x] Move interactive edit CRUD to typed server-side backend client calls.
- [x] Validate request bodies at the SvelteKit server boundary.
- [x] Remove every `session.token` prop and direct authenticated browser API call.

### Task 5: Generated auth contracts

**Files:**
- Modify: `apps/backend/src/modules/auth/dto/index.ts`
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Regenerate: `apps/frontend/openapi/backend.json`
- Regenerate: `apps/frontend/src/lib/server/backend/generated/**`

- [x] Add explicit `{ url }` and `{ token }` response DTOs.
- [x] Regenerate the OpenAPI snapshot and Orval SDK.
- [x] Verify auth endpoints no longer generate `data: void`.

### Task 6: Remove legacy browser credential path

**Files:**
- Modify/Delete: `apps/frontend/src/lib/api/**`
- Modify: remaining routes and components importing `$lib/api`

- [x] Migrate remaining server reads to generated backend endpoints.
- [ ] Remove handwritten UI DTOs once no longer referenced.
- [x] Remove `PUBLIC_API_URL`.
- [x] Add an import-boundary test preventing browser code from importing generated server APIs.

### Task 7: Verification

- [x] Run `pnpm --dir apps/frontend test:infra`.
- [x] Run auth-specific tests.
- [x] Regenerate and verify the OpenAPI/Orval output.
- [x] Run `pnpm --dir apps/frontend check`.
- [x] Run the production build under Bun.
- [ ] Smoke-test login redirect, callback cookie/303, authenticated layout, and logout.
