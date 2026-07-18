# Qualification Lobby Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show qualification lobbies in the shared responsive schedule table, move detailed results into a modal, and lock lobby selection when the qualification stage starts.

**Architecture:** Extract only the responsive desktop/mobile shell from the match schedule. Render lobby-specific summary rows through that shell and keep the existing detailed card inside an accessible modal. Enforce the stage-start boundary in the locked repository assignment transaction and mirror it in frontend button state.

**Tech Stack:** NestJS, Drizzle ORM/PostgreSQL, Jest, SvelteKit, Bun.

## Global Constraints

- Reuse the schedule table shell without converting lobby DTOs into match DTOs.
- Team tournaments show team names; solo tournaments show player names.
- Selection is forbidden at `now >= stage.startsAt` in both frontend and backend.
- No backend DTO or database migration is required.

---

### Task 1: Lock qualification selection after stage start

**Files:**
- Modify: `apps/backend/src/lib/domain/qualification-lobby/qualification-lobby.exception.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.repository.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.repository.spec.ts`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby-view.ts`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby-view.test.ts`

**Interfaces:**
- Produces: `canSelectLobby(seatCount, alreadySelected, stageStartsAt, now?)` and backend `QUALIFICATION_LOBBY_STAGE_STARTED` conflict.

- [ ] Add failing repository tests proving selection is rejected after the stage lock when `startsAt <= now`.
- [ ] Add a failing frontend helper test proving selection is disabled at the exact start instant.
- [ ] Query the stage start after `lockQualificationStage` in both repository selection transactions and reject started stages.
- [ ] Extend the frontend helper with the same boundary and run focused tests.

### Task 2: Share the responsive schedule shell

**Files:**
- Create: `apps/frontend/src/lib/components/schedule/ScheduleTable.svelte`
- Modify: `apps/frontend/src/lib/components/schedule/schedule.svelte`

**Interfaces:**
- Produces: slots `header`, `rows`, and `mobile` inside the existing responsive containers.

- [ ] Move the table/list containers into `ScheduleTable.svelte` without changing match markup.
- [ ] Render the existing match header and rows through the shell.
- [ ] Run frontend typecheck to prove the match schedule remains valid.

### Task 3: Render lobby rows and modal details

**Files:**
- Create: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyTable.svelte`
- Create: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/QualificationLobbiesTab.svelte`

**Interfaces:**
- Consumes: lobby DTOs, `isTeam`, stage start time, selection action slot.
- Produces: summary table/mobile list and `Open` dialog.

- [ ] Render ID, time, teams/players, referee, MP, status, and actions with the shared shell.
- [ ] Add `Open` state and an accessible dialog containing the existing detail card.
- [ ] Preserve selection forms, capacity behavior, pending state, and sync polling; pass stage start into the selection guard.
- [ ] Run focused frontend tests, typecheck, and build.

### Task 4: Verify

- [ ] Run backend tests excluding PostgreSQL-only suites and backend build.
- [ ] Run frontend tests, typecheck, and build.
- [ ] Run `git diff --check`.
- [ ] Run `graphify update .`.
