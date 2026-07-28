# Lazy Qualification History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove qualification score history from tournament page payloads and fetch it only when a lobby history dialog opens.

**Architecture:** `QualificationLobbyService.findByTournament` returns schedule metadata from lightweight joins. A tournament-scoped `getHistory` method reuses `OsuMultiplayerHistoryService` and applies qualification counted/standing enrichment on demand. The shared qualification dialog calls a SvelteKit proxy endpoint and renders existing multiplayer history states.

**Tech Stack:** NestJS, Drizzle ORM, Zod DTOs, SvelteKit, Svelte, TypeScript.

## Global Constraints

- Reuse `OsuMultiplayerHistoryService`.
- Keep qualification statistics results unchanged.
- Do not add dependencies or migrations.
- Generate frontend API files from the backend OpenAPI document.

---

### Task 1: Split qualification lobby summary and history contracts

**Files:**

- Modify: `apps/backend/src/modules/qualification/dto/index.ts`
- Modify: `apps/backend/src/modules/qualification/dto/index.spec.ts`

**Interfaces:**

- Produces: `QualificationLobbyDto` without `attempts` and `standings`.
- Produces: `QualificationLobbyHistoryDto` with `lastSyncedAt`, `attempts`, and `standings`.

- [ ] Write DTO assertions that the list schema strips history fields and the history schema validates attempts and standings.
- [ ] Run the DTO spec and confirm the new assertions fail.
- [ ] Split the shared attempt/standing schemas and add `QualificationLobbyHistoryDto`.
- [ ] Run the DTO spec and confirm it passes.

### Task 2: Move enrichment behind a scoped history method

**Files:**

- Modify: `apps/backend/src/modules/qualification/qualification-lobby.service.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.service.spec.ts`

**Interfaces:**

- Produces: `getHistory(tournamentId, lobbyId)`.
- `findByTournament` returns metadata without calling `roomHistory.get`.

- [ ] Add service tests proving list loading does not call room history and `getHistory` returns counted attempts and standings.
- [ ] Run the service spec and confirm it fails.
- [ ] Join room status metadata in the list query and move history/breakdown calculation into `getHistory`.
- [ ] Run the service spec and confirm it passes.

### Task 3: Expose and generate the history endpoint

**Files:**

- Modify: `apps/backend/src/modules/qualification/qualification-lobby.controller.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.controller.spec.ts`
- Modify generated files under `apps/frontend/openapi` and `apps/frontend/src/lib/api/generated`.
- Modify: `apps/frontend/src/lib/server/backend/client.ts`

**Interfaces:**

- Produces: `GET /api/tournaments/:id/qualification-lobbies/:lobbyId/history`.
- Produces: `qualificationLobbies.history(tournamentId, lobbyId)`.

- [ ] Add a controller scoping test and confirm it fails.
- [ ] Add the typed GET endpoint and confirm the backend tests pass.
- [ ] Refresh the OpenAPI schema and generated frontend client.
- [ ] Add the generated client method.

### Task 4: Load qualification history from the shared dialog

**Files:**

- Create: `apps/frontend/src/routes/api/tournaments/[id]/qualification-lobbies/[lobbyId]/history/+server.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerHistory/multiplayerHistory.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerHistory/multiplayerHistory.test.ts`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyTable.svelte`
- Modify qualification statistics callers to pass `tournamentId`.

**Interfaces:**

- `toQualificationHistory(history, beatmaps)` consumes `QualificationLobbyHistoryDtoOutput`.
- `QualificationLobbyDetailDialog` consumes `tournamentId`, `lobby`, and `beatmaps`.

- [ ] Update the adapter test to use the history DTO and confirm it fails.
- [ ] Update the adapter and confirm its test passes.
- [ ] Add the proxy route.
- [ ] Fetch history on dialog mount, show loader/error/content, and abort on close.
- [ ] Pass `tournamentId` through every shared table/dialog caller.

### Task 5: Verify

- [ ] Run backend tests.
- [ ] Run frontend tests, type checking, and production build.
- [ ] Run `pnpm test`.
- [ ] Run `git diff --check`.
- [ ] Run `graphify update .`.
