# Beatmap Cover URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make backend DTOs the only source of osu! beatmap cover URLs.

**Architecture:** A single pure backend helper constructs the integration URL. Beatmap presentation and metadata mappers expose its result as `coverUrl`; frontend components consume the field without knowing the CDN path.

**Tech Stack:** TypeScript, NestJS, Zod, SvelteKit.

## Global Constraints

- No database migration or persisted URL.
- No service class, configuration layer, or new dependency.
- Generated API files are refreshed from OpenAPI.

---

### Task 1: Backend URL helper

**Files:**

- Create: `apps/backend/src/lib/infrastructure/osu/beatmap-cover-url.ts`
- Test: `apps/backend/src/lib/infrastructure/osu/beatmap-cover-url.spec.ts`

- [ ] Write a failing test for the canonical `cover@2x.jpg` URL.
- [ ] Add the minimal pure helper and make the test pass.

### Task 2: Backend DTO ownership

**Files:**

- Modify: `apps/backend/src/modules/beatmap/types/index.ts`
- Modify: `apps/backend/src/modules/beatmap/beatmap.service.ts`
- Modify: `apps/backend/src/modules/osu/dto/index.ts`
- Modify: `apps/backend/src/modules/osu/osu.service.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.ts`
- Modify: `apps/backend/src/modules/stage/stage-statistics.service.ts`

- [ ] Add `coverUrl` to mappool beatmap and osu metadata outputs.
- [ ] Replace backend URL templates with the helper.
- [ ] Run backend tests and typecheck.

### Task 3: Frontend consumption

**Files:**

- Modify: `apps/frontend/src/lib/components/beatmap/beatmap.svelte`
- Modify: all direct callers of the beatmap component.
- Refresh: generated OpenAPI client and models.

- [ ] Pass backend-provided `coverUrl` through every beatmap component call.
- [ ] Refresh generated API files.
- [ ] Confirm repository search finds the URL template only in the backend helper and its test.
- [ ] Run frontend tests, check, and build.

### Task 4: Project graph

- [ ] Run `graphify update .`.
- [ ] Run `git diff --check` and review the final diff.
