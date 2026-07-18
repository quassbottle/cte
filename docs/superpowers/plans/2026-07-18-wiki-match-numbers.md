# Wiki Match Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store and display wiki match identifiers such as `43c` in `matchNumber` while retaining numeric auto-suggestions for manually created matches.

**Architecture:** Convert the nullable database column and API field from integer to text. Feed the parsed wiki ID directly into the seed row, while the editor computes its suggestion from numeric strings only.

**Tech Stack:** Drizzle ORM/PostgreSQL, NestJS/Zod, SvelteKit/Zod, Jest, Bun.

## Global Constraints

- Generate SQL, journal, and snapshots only through Drizzle Kit CLI.
- Do not add a separate wiki ID field or derive current TWC values in a data migration.
- Keep `matches.id` as the internal CUID.

---

### Task 1: Persist string match numbers

**Files:**
- Modify: `apps/backend/src/lib/infrastructure/db/matches/index.ts`
- Modify: `apps/backend/src/modules/match/dto/index.ts`
- Modify: `apps/backend/src/modules/match/dto/schedule-match.dto.spec.ts`
- Generate: `apps/backend/drizzle/*`

**Interfaces:**
- Produces: `matchNumber: string | null` in database and schedule DTOs.

- [ ] Add a DTO test using `matchNumber: '43c'` and verify the current numeric schema rejects it.
- [ ] Change the Drizzle column to `text` and Zod schemas to trimmed non-empty strings.
- [ ] Generate the migration with `pnpm --filter backend migration:generate`.
- [ ] Run the focused DTO and migration-journal tests.

### Task 2: Preserve wiki IDs during import

**Files:**
- Modify: `apps/backend/scripts/twc-2026-wiki.spec.ts`
- Modify: `apps/backend/scripts/seed-twc-2026.ts`

**Interfaces:**
- Consumes: `TwcMatch.id: string`.
- Produces: seeded `matches.matchNumber` equal to the wiki ID.

- [ ] Add or extend seed/parser coverage with an alphanumeric wiki ID such as `43c`.
- [ ] Verify the test fails while the seed generates per-stage integers.
- [ ] Replace the per-stage counter with `matchNumber: match.id`.
- [ ] Run the focused script tests.

### Task 3: Keep manual auto-numbering

**Files:**
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schedule.test.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`

**Interfaces:**
- Produces: string form payloads and the next positive numeric match number as a string.

- [ ] Change the form test to expect `'43c'` unchanged and verify it fails.
- [ ] Accept optional trimmed text and use a text input.
- [ ] Compute `max + 1` from values matching positive integer strings, ignoring alphanumeric IDs.
- [ ] Run the focused frontend tests and typecheck/build.

### Task 4: Verify

**Files:**
- Update generated frontend API types through the existing project command if required.

- [ ] Run backend tests excluding PostgreSQL-only suites.
- [ ] Run backend and frontend builds.
- [ ] Run `git diff --check`.
- [ ] Run `graphify update .`.
