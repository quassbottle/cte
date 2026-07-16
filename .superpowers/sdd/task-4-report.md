# Task 4 report: qualification owns lobbies and materialized results

## RED

Command:

```bash
pnpm --dir apps/backend test -- --runInBand \
  modules/qualification/qualification-lobby.repository.spec.ts \
  modules/qualification/qualification-lobby.controller.spec.ts \
  modules/qualification/qualification-results.service.spec.ts \
  modules/qualification/qualification-sync.scheduler.spec.ts
```

Result: exit 1. All four suites failed because the consolidated repository,
controller, results service, and scheduler did not exist.

## GREEN

Command:

```bash
pnpm --dir apps/backend test -- --runInBand \
  modules/qualification modules/tournament modules/mappool modules/match \
  lib/infrastructure/db/migration-journal.spec.ts \
  lib/infrastructure/db/qualification-lobbies \
  lib/infrastructure/db/osu-multiplayer
```

Result: exit 0; 16 suites and 56 tests passed.

```bash
pnpm --dir apps/backend build
git diff --check
graphify update .
```

Result: all exited 0. Graph rebuilt with 3,069 nodes and 4,980 edges.

## Implementation

- Added `apps/backend/src/modules/qualification/` with the module, public/host
  controller, scoped lobby service, locking repository, result materializer,
  sync scheduler, DTOs, moved seed calculator, and focused tests.
- Lobby selection locks the target lobby with `FOR UPDATE` before removing the
  old assignment, counting occupied seats, and inserting the new assignment.
- Solo selection uses only the authenticated user. Team selection accepts only
  `teamId` and verifies the authenticated user is the active team's captain.
- Materialization projects raw osu room scores onto active tournament
  competitors and mappool beatmaps, then replaces one stage in one transaction.
  Invalidation only deletes the stage result rows.
- Tournament qualification calculation delegates to the qualification service;
  roster seeds read from materialized results. Mappool and roster mutations
  invalidate the qualification stage.
- Removed the owner-specific match-sync module and legacy sync/attempt schema.
  Removed persisted regular-match scores/winners and kept derived output DTOs.
- Generated `apps/backend/drizzle/0021_curvy_the_professor.sql` and
  `apps/backend/drizzle/meta/0021_snapshot.json` from the schema after restoring
  the journal to 0020.

## Task 4 files

- `apps/backend/src/modules/qualification/**`
- `apps/backend/src/modules/qualification-lobby/**` (deleted/moved)
- `apps/backend/src/modules/tournament/{tournament.module.ts,tournament.service.ts,tournament.service.spec.ts,qualification-seeding.ts,qualification-seeding.spec.ts}`
- `apps/backend/src/modules/mappool/{mappool.module.ts,mappool.service.ts}`
- `apps/backend/src/modules/match/dto/index.ts`
- `apps/backend/src/modules/match-sync/**` (deleted)
- `apps/backend/src/app.module.ts`
- `apps/backend/src/lib/domain/qualification-lobby/**`
- `apps/backend/src/lib/infrastructure/db/{schema.ts,matches/**}`
- `apps/backend/scripts/seed-schedule-tournaments.ts`
- `apps/backend/drizzle/0021_curvy_the_professor.sql`
- `apps/backend/drizzle/meta/{0021_snapshot.json,_journal.json}`

Frontend Task 5 changes were not modified or staged.

## Review fixes

- Result recalculation now locks the qualification stage before loading raw
  inputs and keeps the lock through stage replacement. Invalidation uses the
  same transaction lock, so a concurrent invalidation cannot be overwritten by
  a stale rebuild.
- Lobby selections lock the shared stage row, serializing the same competitor
  and final-seat decisions even when requests target different lobbies.
- Reactivating a member of an assigned team validates the locked lobby capacity
  inside the roster update transaction and rejects a seventeenth occupied seat.
- Deleted the manual `POST :id/qualification/calculate-seeds` route and
  `TournamentService` method. Scheduler/service materialization is the only
  calculation owner.
- Qualification dependencies are required; removed `@Optional`, optional
  chaining, and silent invalidation skips.
- Removed `redScore` and `blueScore` from the base match DTO. Derived schedule
  result fields remain because they are computed from raw osu scores.
- Removed the duplicate root qualification-module import and the dead scheduler
  test mock. Tournament exports the imported qualification module to mappool.

Review verification:

```text
17 suites passed
62 tests passed
backend build passed
migration journal and raw/lobby schema checks passed
git diff --check passed
graphify update: 3,076 nodes, 4,989 edges
```

Intentional audit leftovers: `modules/match/match-sync.scheduler.ts` is the
active regular-match orchestrator using shared raw sync, while `redScore`,
`blueScore`, `score`, and `isWinner` in match result/schedule code are derived
response values rather than persisted or manually accepted compatibility data.
