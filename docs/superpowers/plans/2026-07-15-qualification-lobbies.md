# Qualification Lobbies and Shared osu Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace qualification schedule matches with dedicated lobbies while making one owner-agnostic osu multiplayer sync pipeline the source of all regular-match and qualification scores.

**Architecture:** `OsuMultiplayerSyncModule` owns rooms, leases, normalized games, and raw scores without knowing their domain owner. `MatchModule` derives regular results from those rows; `QualificationModule` owns lobby selection and transactionally materializes stage results after lobby rooms change. Tournament and mappool code can only invalidate qualification results through one narrow service.

**Tech Stack:** PostgreSQL, Drizzle ORM, NestJS, Jest, SvelteKit, Svelte 5, Bun, Orval/OpenAPI.

## Global Constraints

- The production database is empty and will be recreated; do not add legacy qualification-match backfill or dual-write compatibility.
- Store every osu game and score, including unknown external user and beatmap IDs.
- Raw sync tables contain no match/lobby owner type.
- Match results have no manual score input or override.
- Qualification capacity is 16 player seats and must be concurrency-safe.
- Only a solo participant themself or a team captain may choose a lobby.
- Regular matches remain unavailable on qualification stages.
- Do not add an event bus, handler registry, generic scheduled-event model, or new dependency.

---

### Task 1: Add rooms, raw scores, lobbies, and result persistence beside legacy sync

**Files:**
- Create: `apps/backend/src/lib/domain/osu-multiplayer/osu-room.id.ts`
- Create: `apps/backend/src/lib/infrastructure/db/osu-multiplayer/rooms.ts`
- Create: `apps/backend/src/lib/infrastructure/db/osu-multiplayer/games.ts`
- Create: `apps/backend/src/lib/infrastructure/db/osu-multiplayer/scores.ts`
- Create: `apps/backend/src/lib/infrastructure/db/qualification-results/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/qualification-lobbies/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/qualification-lobbies/participants.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/matches/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/schema.ts`
- Test: `apps/backend/src/lib/infrastructure/db/osu-multiplayer/osu-multiplayer.schema.spec.ts`
- Test: `apps/backend/src/lib/infrastructure/db/qualification-lobbies/qualification-lobbies.schema.spec.ts`

**Interfaces:**
- Produces: `OsuRoomId`, `osuMultiplayerRooms`, `osuMultiplayerGames`, `osuMultiplayerScores`, `qualificationLobbies`, `qualificationLobbyPlayers`, `qualificationLobbyTeams`, and `qualificationResults`.
- Produces: `matches.osuRoomId` and `qualificationLobbies.osuRoomId` nullable unique foreign keys.

- [x] **Step 1: Write failing schema tests**

Add assertions equivalent to:

```ts
expect(osuMultiplayerRooms.osuMatchId).toBeDefined();
expect(getTableConfig(osuMultiplayerGames).primaryKeys[0].columns.map(c => c.name))
  .toEqual(['room_id', 'osu_game_id']);
expect(getTableConfig(osuMultiplayerScores).primaryKeys[0].columns.map(c => c.name))
  .toEqual(['room_id', 'osu_game_id', 'osu_user_id']);
expect(matches.osuRoomId).toBeDefined();
```

Assert that lobby assignments have composite `(lobby_id, stage_id)` foreign
keys and unique `(stage_id, user_id)` / `(stage_id, team_id)` indexes. Assert a
`qualification_results` check constraint requires exactly one of `user_id` and
`team_id`.

- [x] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --dir apps/backend test -- --runInBand \
  src/lib/infrastructure/db/osu-multiplayer/osu-multiplayer.schema.spec.ts \
  src/lib/infrastructure/db/qualification-lobbies/qualification-lobbies.schema.spec.ts
```

Expected: FAIL because the raw room tables and new constraints do not exist.

- [x] **Step 3: Add the minimum schema**

Use this shape; retain the repository's branded-ID and timestamp helpers:

```ts
export const osuMultiplayerRooms = pgTable('osu_multiplayer_rooms', {
  id: text('id').$type<OsuRoomId>().primaryKey(),
  osuMatchId: bigint('osu_match_id', { mode: 'number' }).notNull().unique(),
  status: text('status').$type<'active' | 'stopped' | 'completed'>().notNull().default('active'),
  snapshotHash: text('snapshot_hash'),
  nextSyncAt: timestamp('next_sync_at', { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  leaseToken: text('lease_token'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastDataChangedAt: timestamp('last_data_changed_at', { withTimezone: true }),
  lastError: text('last_error'),
  attempts: integer('attempts').notNull().default(0),
  createdAt,
  updatedAt,
});
```

Games use `(roomId, osuGameId)` as primary key. Scores use
`(roomId, osuGameId, osuUserId)` and a composite FK to games; store
`osuBeatmapId`, numeric `score`, and nullable `red | blue` team without internal
user/beatmap FKs.

`qualification_results` contains `stageId`, nullable `userId`, nullable
`teamId`, `seed`, `aggregateScore` as bigint-number, and `calculatedAt`, with
partial unique indexes for solo/team competitors and an XOR check constraint.

Add `osuRoomId` to matches and lobbies. Keep the legacy owner-specific sync,
attempt, and manual-score columns temporarily so the existing application
continues to compile until Tasks 3 and 4 switch every caller.

- [x] **Step 4: Verify the additive schema**

Do not generate a migration yet: the schema intentionally contains both paths
until all consumers move. Run the focused schema tests and inspect composite
foreign keys and unique indexes through Drizzle metadata.

- [x] **Step 5: Verify GREEN**

Run the two schema tests and `pnpm --dir apps/backend build`.

- [x] **Step 6: Commit**

```bash
git add apps/backend/src/lib/domain/osu-multiplayer \
  apps/backend/src/lib/infrastructure/db
git commit -m "refactor(db): store raw osu multiplayer scores"
```

---

### Task 2: Build the owner-agnostic osu multiplayer sync module

**Files:**
- Create: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.module.ts`
- Create: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.ts`
- Create: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.service.ts`
- Create: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.types.ts`
- Move: `apps/backend/src/modules/match-sync/osu-match.client.ts` to the new module
- Move: `apps/backend/src/modules/match-sync/mp-url.ts` and its test to the new module
- Delete qualification-specific extraction from `apps/backend/src/modules/match-sync`
- Test: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.spec.ts`
- Test: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.service.spec.ts`

**Interfaces:**
- Produces: `ensureRoom(mpUrl: string): Promise<OsuRoomId>`.
- Produces: `sync(roomId: OsuRoomId, force?: boolean): Promise<{ changed: boolean; status: RoomSyncStatus }>`.
- Produces: `stop(roomId: OsuRoomId): Promise<void>`.
- Consumes: the existing `OsuService.getMatchSnapshot` and sync timing env values.

- [x] **Step 1: Write failing repository tests**

Cover these behaviors independently:

```ts
it('persists unknown osu users and beatmaps instead of dropping their scores');
it('returns changed false for the same normalized snapshot');
it('upserts changed games and scores atomically');
it('allows only one unexpired lease for a room');
```

Use a snapshot containing two games and a score whose osu IDs do not exist in
application tables. Assert raw values are inserted unchanged.

- [x] **Step 2: Run repository tests and verify RED**

Expected: FAIL because room-based leasing and raw persistence are absent.

- [x] **Step 3: Implement normalized hashing and persistence**

Normalize games and scores in deterministic ID order. Use Node's standard
library rather than a dependency:

```ts
const snapshotHash = createHash('sha256')
  .update(JSON.stringify(normalizedSnapshot))
  .digest('hex');
```

Under a leased room transaction, skip raw rewrites when the hash is unchanged.
Otherwise upsert games/scores, remove rows no longer present in the complete
snapshot, and set `lastDataChangedAt` with the new hash. Always update
`lastSyncedAt`; apply existing bounded retry/backoff behavior on failure.

- [x] **Step 4: Write failing service tests**

Verify `ensureRoom` reuses an existing osu match ID, rejects invalid URLs, and
`sync` fetches by room's osu match ID without accepting a match/lobby type.

- [x] **Step 5: Implement the service and verify GREEN**

Keep the service as orchestration only:

```ts
public async sync(roomId: OsuRoomId, force = false) {
  const lease = await this.repository.claim(roomId, force);
  if (!lease) return { changed: false, status: 'active' as const };
  try {
    const snapshot = await this.client.get(lease.osuMatchId);
    return await this.repository.applySnapshot(lease, snapshot);
  } catch (error) {
    await this.repository.applyFailure(lease, error);
    throw error;
  }
}
```

Run all new module tests and the backend build.

- [x] **Step 6: Commit**

```bash
git add apps/backend/src/modules/osu-multiplayer-sync apps/backend/src/modules/match-sync
git commit -m "refactor(sync): add shared osu room ingestion"
```

---

### Task 3: Make regular matches consume raw room scores

**Files:**
- Modify: `apps/backend/src/modules/match/match.module.ts`
- Modify: `apps/backend/src/modules/match/match.service.ts`
- Modify: `apps/backend/src/modules/match/dto/index.ts`
- Modify: `apps/backend/src/modules/match/dto/schedule-match.dto.spec.ts`
- Create: `apps/backend/src/modules/match/match-result.service.ts`
- Create: `apps/backend/src/modules/match/match-sync.scheduler.ts`
- Modify legacy match-sync callers only where required to route regular matches through the shared module
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts` schedule reads
- Test: `apps/backend/src/modules/match/match.service.spec.ts`
- Test: `apps/backend/src/modules/match/match-result.service.spec.ts`
- Test: `apps/backend/src/modules/match/match-sync.scheduler.spec.ts`

**Interfaces:**
- Consumes: `OsuMultiplayerSyncService.ensureRoom`, `sync`, and `stop`.
- Produces: match DTO results derived from raw room games/scores.
- Produces no match-specific raw sync repository.

- [x] **Step 1: Write failing match contract tests**

Assert qualification stages reject regular match creation, DTO inputs contain no
manual `redScore`, `blueScore`, player score, or winner fields, and an `mpUrl`
creates/reuses a room reference.

- [x] **Step 2: Write failing aggregation tests**

Reuse the existing pure `calculateMatchPoints` rules. Cover:

```ts
it('derives team points from raw scores on allowed mappool beatmaps');
it('maps solo osu user ids to the two scheduled participants');
it('returns a pending result without synchronized room data');
```

- [x] **Step 3: Verify RED, then implement the minimum integration**

Remove writes to deleted score columns. On create/update, attach the room
returned by `ensureRoom`; stop the old room when the URL is removed or changed.
`MatchResultService` queries room games/scores and calls the existing pure score
calculator. Schedule DTO assembly calls this service instead of reading cached
match columns.

- [x] **Step 4: Add the thin regular-match scheduler**

The scheduler selects active room IDs referenced by ordinary matches and calls
`sync(roomId)`; it owns no lease or snapshot logic. Add a test proving it never
selects qualification lobbies.

- [x] **Step 5: Leave qualification legacy sync isolated until Task 4**

Remove regular-match callers from the owner-specific repository/service, but
keep the remaining qualification path compiling until Task 4 switches it.
Keep pure regular score calculation colocated with the match feature.

- [x] **Step 6: Verify and commit**

Run match tests, tournament schedule tests, and backend build, then commit:

```bash
git add apps/backend/src/modules/match apps/backend/src/modules/match-sync \
  apps/backend/src/modules/tournament
git commit -m "refactor(match): derive results from raw osu scores"
```

---

### Task 4: Consolidate qualification lobbies and materialized results

**Files:**
- Create: `apps/backend/src/modules/qualification/qualification.module.ts`
- Move/update: `apps/backend/src/modules/qualification-lobby/qualification-lobby.controller.ts` into `apps/backend/src/modules/qualification/`
- Move/update: `apps/backend/src/modules/qualification-lobby/qualification-lobby.service.ts` into `apps/backend/src/modules/qualification/`
- Move/update: `apps/backend/src/modules/qualification-lobby/qualification-lobby.service.spec.ts` into `apps/backend/src/modules/qualification/`
- Move/update: `apps/backend/src/modules/qualification-lobby/dto/index.ts` into `apps/backend/src/modules/qualification/dto/index.ts`
- Delete: `apps/backend/src/modules/qualification-lobby/qualification-lobby.module.ts`
- Create: `apps/backend/src/modules/qualification/qualification-lobby.repository.ts`
- Create: `apps/backend/src/modules/qualification/qualification-results.service.ts`
- Create: `apps/backend/src/modules/qualification/qualification-sync.scheduler.ts`
- Move: `apps/backend/src/modules/tournament/qualification-seeding.ts` and its test into the qualification module
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.module.ts`
- Modify: relevant mappool and participant mutation services to call `invalidate(stageId)`
- Delete: obsolete files under `apps/backend/src/modules/match-sync/`
- Delete: `apps/backend/src/lib/infrastructure/db/matches/osu-sync.ts`
- Delete: `apps/backend/src/lib/infrastructure/db/matches/qualification-attempts.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/matches/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/matches/participants.ts`
- Replace: `apps/backend/drizzle/0021_curly_solo.sql`
- Delete: `apps/backend/drizzle/0022_stiff_red_shift.sql`
- Replace/delete corresponding snapshots and journal entries, then regenerate migration 0021 from schema
- Test: `apps/backend/src/modules/qualification/qualification-lobby.service.spec.ts`
- Test: `apps/backend/src/modules/qualification/qualification-results.service.spec.ts`
- Test: `apps/backend/src/modules/qualification/qualification-sync.scheduler.spec.ts`
- Test: controller authorization tests under `apps/backend/src/modules/qualification/`

**Interfaces:**
- Produces: public lobby query and host-only management endpoints.
- Produces: self-only solo selection and captain-only team selection.
- Produces: `QualificationResultsService.invalidate(stageId)`.
- Consumes: raw rooms/games/scores and `OsuMultiplayerSyncService.sync`.

- [x] **Step 1: Write failing authorization and capacity tests**

Cover:

```ts
it('uses the authenticated user for solo selection and accepts no userId override');
it('rejects a non-captain team selection');
it('scopes sync and mutations to the route tournament');
it('allows anonymous lobby reads');
it('serializes two selections for the final seat');
```

The capacity test must exercise the transaction/locking contract rather than
only mock a seat count. Lock the target lobby row with `FOR UPDATE` before
deleting the old assignment, counting seats, and inserting the new assignment.

- [x] **Step 2: Verify RED and implement lobby repository/service**

Keep controller methods thin. Solo DTO has an empty body; use `RequestUser.id`.
Team DTO contains only `teamId`. Every service method receives `tournamentId`
and verifies the lobby's stage belongs to it. Return display DTOs with referee
and participant names, not only IDs.

- [x] **Step 3: Write failing materialization tests**

Test the existing qualification algorithm against raw external IDs mapped to
active users/teams and mappool beatmaps. Verify:

- incomplete assignments do not materialize results;
- one stage replacement is atomic;
- stale results remain retryable after a failed rebuild;
- team scores aggregate active members;
- unknown unrelated osu scores do not affect results.

- [x] **Step 4: Implement one-table materialization**

Move the pure seed calculator unchanged except for accepting attempts projected
from raw scores. `recalculate(stageId)` loads all inputs once, computes results,
then deletes and inserts that stage's rows in one transaction. `invalidate`
only deletes those rows.

Results are stale when absent or when their oldest `calculatedAt` is earlier
than the stage's greatest lobby-room `lastDataChangedAt`.

- [x] **Step 5: Add qualification sync orchestration**

Group active lobby room IDs by stage, sync each room, and call
`recalculate(stageId)` once when results are stale and assignments are complete.
The scheduler must not contain osu fetching, lease, retry, or raw-upsert logic.

- [x] **Step 6: Move qualification ownership out of TournamentService**

Tournament routes may retain their public URL for compatibility, but delegate
roster/result work to qualification services. Remove qualification-attempt and
seed write logic from `TournamentService`. Mappool, assignment, and withdrawal
mutations call the narrow invalidation method.

- [x] **Step 7: Remove legacy persistence and generate one clean migration**

After no caller references it, delete `match_osu_sync`,
`qualification_attempts`, match `mp_url/red_score/blue_score`, and participant
`score/is_winner` from the Drizzle schema. Remove the uncommitted 0021/0022
files and journal entries, leaving 0020 last, then run:

```bash
pnpm --dir apps/backend migration:generate
```

Do not hand-write DDL or data migration. Inspect the generated migration for
the new raw-score/lobby/result tables and deletion of obsolete persistence.

- [x] **Step 8: Verify and commit**

Run all qualification, tournament, mappool, and backend build checks, then:

```bash
git add apps/backend/src/modules/qualification apps/backend/src/modules/qualification-lobby \
  apps/backend/src/modules/tournament apps/backend/src/modules/mappool apps/backend/src/app.module.ts \
  apps/backend/src/lib/infrastructure/db apps/backend/drizzle
git commit -m "feat(qualification): materialize lobby results"
```

---

### Task 5: Generate the API and finish the public/editor UI

**Files:**
- Regenerate: `apps/frontend/openapi/backend.json`
- Regenerate: `apps/frontend/src/lib/server/backend/generated/`
- Regenerate: `apps/frontend/src/lib/api/generated/model/`
- Delete: `apps/frontend/src/lib/components/qualificationLobby/types.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/QualificationLobbiesTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbiesTab.svelte`
- Modify: regular schedule form/card components to remove manual scores
- Test: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby.test.ts`
- Test: existing tournament server query/action tests

**Interfaces:**
- Consumes only generated qualification DTO/input types.
- Provides public player/captain selection and host-only management UI.

- [x] **Step 1: Write failing component and server tests**

Render a lobby card and assert badge, localized time, referee name, participant
names, capacity, room URL, sync status, and beatmap-grouped attempts. Verify a
full lobby disables new selection but still permits moving a competitor already
occupying seats in that lobby. Add action tests proving the browser cannot send
another solo user's ID.

- [x] **Step 2: Run tests and `svelte-check` to verify RED**

Confirm the existing duplicate `actions` slot and stale backend mocks fail for
the expected reasons.

- [x] **Step 3: Refresh OpenAPI artifacts**

Start the local backend stack, wait for `http://127.0.0.1:3000/docs-json` to
respond, and then refresh artifacts:

```bash
docker compose -f apps/infra/docker-compose.yml up -d --build postgres nats migrate backend
pnpm --dir apps/frontend api:refresh
```

Replace handwritten `Record<string, unknown>`, raw `backendFetch` lobby calls,
and local `QualificationLobby` types with generated functions and DTOs.

- [x] **Step 4: Implement the minimal UI**

Use one `actions` slot container. Public page actions submit only `lobbyId`;
backend derives the current solo user, while team selection submits `teamId`.
Host editor manages number, referee, times, room URL, delete, start, and stop.
Poll every 10 seconds while any displayed room status is active.

Remove manual regular-match score fields and keep qualification stages out of
the ordinary schedule tabs.

- [x] **Step 5: Verify and commit**

Run component tests, frontend infrastructure tests, `check`, API consistency,
and production build, then:

```bash
git add apps/frontend
git commit -m "feat(frontend): add qualification lobby workflow"
```

---

### Task 6: Full-system verification and cleanup

**Files:**
- Modify only files required by failures found in this task
- Update: `docs/superpowers/plans/2026-07-15-qualification-lobbies.md` checkboxes

- [x] **Step 1: Search for obsolete architecture**

Run:

```bash
rg -n "matchOsuSync|qualificationAttempts|MatchSyncService|redScore|blueScore|isWinner|QualificationLobby.*Record<string, unknown>" apps
```

Expected: no owner-specific sync/attempt storage or manual-score input remains;
DTO output names may remain only where they represent derived results.

- [x] **Step 2: Run formatting without broad unrelated rewrites**

Format only files touched by this feature using repository Prettier configs,
then run `git diff --check`.

- [x] **Step 3: Run the complete verification matrix**

```bash
pnpm --dir apps/backend test -- --runInBand
pnpm --dir apps/backend build
pnpm --dir apps/frontend test:infra
bun --cwd apps/frontend test src/lib/components/qualificationLobby
pnpm --dir apps/frontend check
pnpm --dir apps/frontend api:check
pnpm --dir apps/frontend build
```

Expected: every command exits 0 with no failing tests or diagnostics.

- [x] **Step 4: Review the final diff against the design**

Check each invariant in the design spec, inspect the generated migration, and
confirm unrelated user changes were preserved. Do not add abstractions merely
to remove small local duplication.

- [x] **Step 5: Commit verification-only cleanup if needed**

```bash
git diff --name-only
git add docs/superpowers/plans/2026-07-15-qualification-lobbies.md
git commit -m "chore: verify qualification lobby architecture"
```

If verification required source fixes, add only the paths printed by
`git diff --name-only` that belong to this feature; do not stage unrelated user
changes.
