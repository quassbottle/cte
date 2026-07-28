# Stage Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show lazy-loaded, sortable per-map results for every tournament stage, preserving qualification seeds and showing every regular-stage attempt.

**Architecture:** Extend the existing qualification statistics path into a stage-scoped endpoint and reuse its table and sorting UI. Qualification data is adapted to one-attempt arrays; regular-stage attempts are aggregated from synchronized multiplayer scores and ranked per beatmap.

**Tech Stack:** NestJS, Drizzle ORM, Zod, SvelteKit, Vitest/Jest.

## Global Constraints

- No new dependencies or duplicate statistics table.
- Qualification retains seeds; regular stages omit them.
- Every regular-stage game is a separate ranked attempt.
- Missing map results sort as zero.
- Statistics are fetched only for the selected stage.

---

### Task 1: Stage statistics contract and aggregation

**Files:**

- Modify: `apps/backend/src/modules/qualification/dto/index.ts`
- Create: `apps/backend/src/modules/stage/stage-statistics.ts`
- Test: `apps/backend/src/modules/stage/stage-statistics.spec.ts`

- [ ] Write a failing test proving tied attempt ranking, multiple attempts from one team, and missing-result sorting.
- [ ] Run `pnpm --filter backend test -- stage-statistics.spec.ts --runInBand` and confirm it fails.
- [ ] Add the minimal pure aggregation/ranking functions and common Zod response/query schema.
- [ ] Run the focused test and confirm it passes.

### Task 2: Stage-scoped backend endpoint

**Files:**

- Create: `apps/backend/src/modules/stage/stage-statistics.service.ts`
- Modify: `apps/backend/src/modules/stage/stage.controller.ts`
- Modify: `apps/backend/src/modules/stage/stage.module.ts`
- Modify: `apps/backend/src/modules/qualification/qualification.module.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.ts`

- [ ] Add a failing service test for qualification delegation and regular-stage aggregation.
- [ ] Add `GET /api/tournaments/:tournamentId/stages/:id/statistics`.
- [ ] Query stage mappool, competitors, matches, games, and scores; aggregate team/game attempts and apply backend sorting.
- [ ] Run backend unit tests and typecheck.

### Task 3: Lazy Statistics UI

**Files:**

- Rename: `apps/frontend/src/routes/events/[slug]/components/QualificationStatisticsTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/qualification-statistics-sort.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/components/qualification-statistics-sort.test.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.server.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`

- [ ] Add failing URL/sort tests for stage selection and desc/asc map toggling.
- [ ] Rename the top tab to Statistics and add stage tabs.
- [ ] Fetch only the active stage statistics and render all attempts in each cell.
- [ ] Keep qualification lobby-history buttons and add regular match-history buttons per attempt.
- [ ] Refresh generated API client, then run frontend tests, check, and build.

### Task 4: Verification

- [ ] Run `pnpm --filter backend test -- --runInBand`.
- [ ] Run `pnpm --filter frontend test:infra`, `pnpm --filter frontend check`, and `pnpm --filter frontend build`.
- [ ] Run `graphify update .`.
- [ ] Inspect `git diff --check` and the final diff.
