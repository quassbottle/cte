# Mappool Beatmap Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tournament hosts and administrators reorder all maps in a mappool by dragging, with immediate atomic persistence.

**Architecture:** Store a global `position` beside the existing mod-specific `index`, expose one guarded full-list reorder operation, and use native HTML drag events with optimistic UI. Reuse the existing mappool policy, SvelteKit form action, and generated backend client.

**Tech Stack:** NestJS, Drizzle ORM/PostgreSQL, Zod, SvelteKit/Svelte 5, Jest, Bun test.

## Global Constraints

- Generate migration metadata and SQL only with Drizzle Kit; never hand-edit journal or snapshots.
- Add no drag-and-drop dependency.
- Reordering must not change `mod` or `index`.
- Only tournament hosts and administrators may reorder.

---

### Task 1: Persist and validate global ordering

**Files:**
- Modify: `apps/backend/src/lib/infrastructure/db/mappools/beatmaps.ts`
- Modify: `apps/backend/src/modules/mappool/dto/index.ts`
- Modify: `apps/backend/src/modules/mappool/mappool.controller.ts`
- Modify: `apps/backend/src/modules/mappool/mappool.service.ts`
- Create: `apps/backend/src/modules/mappool/mappool.service.spec.ts`
- Generate: `apps/backend/drizzle/*`

**Interfaces:**
- Produces: `POST /mappools/:id/beatmaps/reorder` with `{ beatmapIds: number[] }`.
- Produces: `MappoolService.reorderBeatmaps({ id, osuBeatmapIds })`.

- [ ] Write backend tests proving exact-list validation, transaction updates, append-at-end, and position-based reads.
- [ ] Run the focused Jest test and confirm it fails because ordering support is absent.
- [ ] Add `position`, DTO, controller route, and minimal transactional service implementation.
- [ ] Run the focused Jest test and confirm it passes.
- [ ] Run `pnpm --filter backend migration:generate -- --name=mappool-beatmap-position` and extend only the generated SQL with deterministic backfill before making `position` non-null if Drizzle cannot express the backfill.
- [ ] Run backend typecheck/build and focused tests.

### Task 2: Connect autosave and native drag-and-drop

**Files:**
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/lib/types/tournament-edit-action.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/mappools/MappoolCard.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/mappools/MappoolBeatmapRow.svelte`
- Create: `apps/frontend/src/lib/utils/reorder.ts`
- Create: `apps/frontend/src/lib/utils/reorder.test.ts`
- Regenerate: `apps/frontend/openapi/backend.json`, generated endpoint client and API models.

**Interfaces:**
- Consumes: reorder endpoint from Task 1.
- Produces: `moveItem(items, from, to)` for the optimistic list update.

- [ ] Write a Bun test for moving an item up, down, and leaving it in place.
- [ ] Run the focused test and confirm it fails because the helper is absent.
- [ ] Implement the smallest immutable reorder helper and confirm the focused test passes.
- [ ] Refresh the generated API client from the backend OpenAPI schema.
- [ ] Add the validated SvelteKit form action and command that submit the complete ordered ID list.
- [ ] Add a native draggable handle, optimistic local list, pending lock, rollback, and error display.
- [ ] Run frontend tests, checks, and build.

### Task 3: Verify integration and refresh the graph

**Files:**
- Update: `graphify-out/*`

- [ ] Run backend focused tests and build.
- [ ] Run frontend infrastructure tests, Svelte check, and build.
- [ ] Run `git diff --check` and inspect the complete diff for unrelated changes.
- [ ] Run `graphify update .`.
