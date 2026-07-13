# Osu Match Result Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически и по ручному запросу синхронизировать счет матча турнира из osu! multiplayer, учитывая только завершенные игры на картах единственного маппула стадии.

**Architecture:** Изолированный `match-sync` модуль получает нормализованный снимок osu API, чистой функцией пересчитывает счет с нуля и атомарно сохраняет его. PostgreSQL хранит durable job, lease и fencing token; `@nestjs/schedule` запускает фоновые проходы, а `POST /matches/:matchId/sync` вызывает тот же one-shot use case.

**Tech Stack:** NestJS 11, `@nestjs/schedule`, TypeScript, Drizzle ORM, PostgreSQL 17, `osu-api-extended` 3.1.8, Jest, SvelteKit, Bun tests, Orval.

## Global Constraints

- У стадии может быть только один маппул; закрепить это unique index на `mappools.stage_id`.
- Учитывать только завершенные osu games, карту из маппула стадии и результаты обоих назначенных игроков.
- Сопоставлять игроков только по `users.osu_id`; ничьи, посторонние карты/игроки и неполные игры игнорировать.
- Фоновый sync работает до `match.end_time`, удаления `mpUrl` или ручного `DELETE /matches/:matchId/sync`.
- `POST /matches/:matchId/sync` делает ровно один fetch/recalculate/write и не меняет `stopped/completed` на `active`.
- Ручной счет запрещен во время `active`; при ручной записи после stop/completed инвалидировать текущую lease.
- Несколько реплик координируются только через PostgreSQL; поздний worker не может записать результат с устаревшим lease token.
- Ошибки API повторяются с ограниченным exponential backoff; истекшую lease подхватывает другая реплика.
- Frontend получает результат через REST polling без WebSocket.
- Не добавлять NATS, отдельный worker, таблицу osu games или новую frontend state-библиотеку.

---

## File Map

**Backend persistence and configuration**

- Create `apps/backend/src/lib/infrastructure/db/matches/osu-sync.ts` — Drizzle table and sync status types.
- Modify `apps/backend/src/lib/infrastructure/db/schema.ts` — export sync table.
- Modify `apps/backend/src/lib/infrastructure/db/mappools/index.ts` — unique stage index.
- Create `apps/backend/drizzle/0016_osu_match_sync.sql` — deployable schema migration.
- Modify `apps/backend/src/lib/common/env/env.ts` and `apps/backend/.env.example` — polling/lease/backoff settings.
- Modify `apps/backend/package.json`, `pnpm-lock.yaml`, `apps/backend/pnpm-lock.yaml` — `@nestjs/schedule`.

**Backend sync feature**

- Create `apps/backend/src/modules/match-sync/types.ts` — normalized snapshot, lease and result contracts.
- Create `apps/backend/src/modules/match-sync/mp-url.ts` — strict official osu URL parser.
- Create `apps/backend/src/modules/match-sync/score.ts` — pure score calculator.
- Create `apps/backend/src/modules/match-sync/osu-match.client.ts` — adapter over infrastructure osu service.
- Create `apps/backend/src/modules/match-sync/match-sync.repository.ts` — durable state, claims, inputs and atomic writes.
- Create `apps/backend/src/modules/match-sync/match-sync.service.ts` — `syncOnce` orchestration.
- Create `apps/backend/src/modules/match-sync/match-sync.scheduler.ts` — scheduled batch runner.
- Create `apps/backend/src/modules/match-sync/match-sync-lifecycle.service.ts` — match create/update/stop integration.
- Create `apps/backend/src/modules/match-sync/match-sync.controller.ts` — GET/POST/DELETE `/matches/:matchId/sync`.
- Create `apps/backend/src/modules/match-sync/dto/index.ts` — REST schemas.
- Create `apps/backend/src/modules/match-sync/match-sync.module.ts` — module boundary.
- Modify `apps/backend/src/lib/infrastructure/osu/osu.service.ts` — paginated match endpoint.
- Modify `apps/backend/src/lib/infrastructure/osu/osu.module.ts` — keep client exported.
- Modify `apps/backend/src/modules/match/match.module.ts`, `match.service.ts`, `dto/index.ts`, `schedule.service.ts` — lifecycle and public status.
- Modify `apps/backend/src/modules/auth/policies/resolvers/match-policy-context.resolver.ts` — direct match route authorization.
- Modify `apps/backend/src/modules/auth/policies/ability.factory.ts` — allow host `read` for sync diagnostics.
- Modify `apps/backend/src/app.module.ts` — scheduler and sync module registration.

**Frontend**

- Refresh `apps/frontend/openapi/backend.json`, `apps/frontend/src/lib/server/backend/generated/endpoints.ts`, and generated models under `apps/frontend/src/lib/api/generated/model/`.
- Modify `apps/frontend/src/lib/server/backend/client.ts` and `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts` — sync calls.
- Modify `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts` — host diagnostics map.
- Modify `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts` and `apps/frontend/src/lib/types/tournament-edit-action.ts` — one-shot/stop actions.
- Create `apps/frontend/src/lib/utils/active-sync-poller.ts` — small reusable polling lifecycle.
- Modify both public and edit `ScheduleTab.svelte` — REST refresh while active.
- Modify `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte` and `ScheduleTab.svelte` — state, one-shot and stop controls.
- Modify `apps/frontend/src/lib/components/schedule/schedule-view.ts` and `apps/frontend/src/lib/components/match/types.ts` — status propagation.

---

### Task 1: Durable sync schema, scheduler dependency and settings

**Files:**
- Create: `apps/backend/src/lib/infrastructure/db/matches/osu-sync.ts`
- Create: `apps/backend/drizzle/0016_osu_match_sync.sql`
- Create: `apps/backend/src/lib/common/env/env.spec.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/schema.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/mappools/index.ts`
- Modify: `apps/backend/src/lib/common/env/env.ts`
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/backend/pnpm-lock.yaml`

**Interfaces:**
- Produces: `MatchSyncStatus`, `matchOsuSync`, and four positive integer environment values.

- [ ] **Step 1: Write the failing environment parsing test**

```ts
import { envSchema } from './env';

const required = {
  DATABASE_URL: 'postgres://localhost/db',
  OSU_CLIENT_ID: '1',
  OSU_CLIENT_SECRET: 'secret',
  OSU_REDIRECT_URL: 'http://localhost/callback',
  JWT_SECRET: 'secret',
  JWT_EXPIRES_IN: '60',
};

it('provides positive osu match sync defaults', () => {
  const env = envSchema.parse(required);
  expect(env.OSU_MATCH_SYNC_POLL_INTERVAL_MS).toBe(15_000);
  expect(env.OSU_MATCH_SYNC_LEASE_MS).toBe(60_000);
  expect(env.OSU_MATCH_SYNC_BATCH_SIZE).toBe(10);
  expect(env.OSU_MATCH_SYNC_MAX_BACKOFF_MS).toBe(300_000);
});

it('rejects non-positive sync settings', () => {
  expect(() =>
    envSchema.parse({ ...required, OSU_MATCH_SYNC_BATCH_SIZE: '0' }),
  ).toThrow();
});
```

- [ ] **Step 2: Run the test and verify the missing settings fail**

Run: `pnpm --filter backend test -- env.spec.ts --runInBand`

Expected: FAIL because the four properties do not exist.

- [ ] **Step 3: Add the dependency and minimal schema/config implementation**

Run: `pnpm --filter backend add @nestjs/schedule`

Add this helper and fields to `env.ts`:

```ts
const positiveInt = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

OSU_MATCH_SYNC_POLL_INTERVAL_MS: positiveInt(15_000),
OSU_MATCH_SYNC_LEASE_MS: positiveInt(60_000),
OSU_MATCH_SYNC_BATCH_SIZE: positiveInt(10),
OSU_MATCH_SYNC_MAX_BACKOFF_MS: positiveInt(300_000),
```

Create the Drizzle table:

```ts
export const matchSyncStatuses = ['active', 'stopped', 'completed'] as const;
export type MatchSyncStatus = (typeof matchSyncStatuses)[number];

export const matchOsuSync = pgTable(
  'match_osu_sync',
  {
    matchId: text('match_id').$type<MatchId>().primaryKey()
      .references(() => matches.id, { onDelete: 'cascade' }),
    osuMatchId: bigint('osu_match_id', { mode: 'number' }).notNull(),
    status: text('status').$type<MatchSyncStatus>().notNull().default('active'),
    nextSyncAt: timestamp('next_sync_at', { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    leaseToken: text('lease_token'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastError: text('last_error'),
    attempts: integer('attempts').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('match_osu_sync_osu_match_id_unique').on(table.osuMatchId),
    index('match_osu_sync_due_idx').on(table.status, table.nextSyncAt),
    check('match_osu_sync_status_check', sql`${table.status} in ('active', 'stopped', 'completed')`),
  ],
);
```

Create the migration with the complete SQL below:

```sql
CREATE TABLE "match_osu_sync" (
  "match_id" text PRIMARY KEY NOT NULL,
  "osu_match_id" bigint NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_until" timestamp with time zone,
  "lease_token" text,
  "last_synced_at" timestamp with time zone,
  "last_error" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "match_osu_sync_match_id_matches_id_fk"
    FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade,
  CONSTRAINT "match_osu_sync_status_check"
    CHECK ("status" IN ('active', 'stopped', 'completed'))
);
CREATE UNIQUE INDEX "match_osu_sync_osu_match_id_unique"
  ON "match_osu_sync" ("osu_match_id");
CREATE INDEX "match_osu_sync_due_idx"
  ON "match_osu_sync" ("status", "next_sync_at");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM mappools GROUP BY stage_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enforce one mappool per stage: duplicate stage_id exists';
  END IF;
END $$;
CREATE UNIQUE INDEX "mappools_stage_id_unique" ON "mappools" ("stage_id");
```

- [ ] **Step 4: Run unit test, typecheck/build and migration inspection**

Run: `pnpm --filter backend test -- env.spec.ts --runInBand`

Expected: PASS.

Run: `pnpm --filter backend build`

Expected: exit 0.

Run: `rg -n "match_osu_sync|mappools_stage_id_unique" apps/backend/drizzle/0016_osu_match_sync.sql`

Expected: table, status check, due index, osu ID unique index, FK and mappool unique index are present.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/package.json apps/backend/pnpm-lock.yaml pnpm-lock.yaml apps/backend/.env.example apps/backend/src/lib/common/env apps/backend/src/lib/infrastructure/db apps/backend/drizzle/0016_osu_match_sync.sql
git commit -m "feat: add durable osu match sync state"
```

### Task 2: Strict mp URL parser and pure score calculation

**Files:**
- Create: `apps/backend/src/modules/match-sync/types.ts`
- Create: `apps/backend/src/modules/match-sync/mp-url.ts`
- Create: `apps/backend/src/modules/match-sync/mp-url.spec.ts`
- Create: `apps/backend/src/modules/match-sync/score.ts`
- Create: `apps/backend/src/modules/match-sync/score.spec.ts`

**Interfaces:**
- Produces: `parseOsuMatchId(value: string): number | null`.
- Produces: `calculateMatchPoints(input: CalculateMatchPointsInput): Map<number, number>`.
- Produces: normalized `OsuMatchSnapshot`, `OsuMatchGame`, `OsuMatchScore` types.

- [ ] **Step 1: Write URL and scoring tests**

Cover both official URLs and rejection of query/fragment/wrong host/extra path. Use this scoring fixture and assertions:

```ts
const snapshot: OsuMatchSnapshot = {
  closedAt: null,
  games: [
    { id: 1, beatmapId: 101, endedAt: new Date(), scores: [{ userId: 11, score: 10 }, { userId: 22, score: 5 }] },
    { id: 2, beatmapId: 102, endedAt: new Date(), scores: [{ userId: 11, score: 4 }, { userId: 22, score: 8 }] },
    { id: 3, beatmapId: 101, endedAt: new Date(), scores: [{ userId: 11, score: 7 }, { userId: 22, score: 7 }] },
    { id: 4, beatmapId: 999, endedAt: new Date(), scores: [{ userId: 11, score: 99 }, { userId: 22, score: 1 }] },
    { id: 5, beatmapId: 101, endedAt: null, scores: [{ userId: 11, score: 99 }, { userId: 22, score: 1 }] },
    { id: 6, beatmapId: 101, endedAt: new Date(), scores: [{ userId: 11, score: 99 }] },
  ],
};

expect(calculateMatchPoints({
  snapshot,
  playerOsuIds: [11, 22],
  allowedBeatmapIds: new Set([101, 102]),
})).toEqual(new Map([[11, 1], [22, 1]]));
```

Also assert that an extra third player's score does not affect comparison and repeated calculation returns the same map.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter backend test -- 'match-sync/(mp-url|score)\.spec\.ts' --runInBand`

Expected: FAIL because modules are missing.

- [ ] **Step 3: Implement with platform primitives only**

```ts
export function parseOsuMatchId(value: string): number | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'osu.ppy.sh' || url.search || url.hash) return null;
    const match = url.pathname.match(/^\/(?:community\/matches|mp)\/(\d+)$/);
    const id = match ? Number(match[1]) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
```

Implement `calculateMatchPoints` as one loop over games: initialize both players at zero, skip every ineligible game, find exactly both scheduled score rows, compare, increment one value, and return the map. Do not persist game IDs or infer points from mods.

- [ ] **Step 4: Run focused tests**

Run: `pnpm --filter backend test -- 'match-sync/(mp-url|score)\.spec\.ts' --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/match-sync
git commit -m "feat: calculate osu match points"
```

### Task 3: Paginated osu multiplayer client

**Files:**
- Create: `apps/backend/src/lib/infrastructure/osu/osu-match.spec.ts`
- Create: `apps/backend/src/modules/match-sync/osu-match.client.ts`
- Modify: `apps/backend/src/lib/infrastructure/osu/osu.service.ts`

**Interfaces:**
- Consumes: `OsuMatchSnapshot` from Task 2.
- Produces: `OsuService.getMatchSnapshot({ osuMatchId: number }): Promise<OsuMatchSnapshot>`.
- Produces: injectable `OsuMatchClient.get(osuMatchId: number): Promise<OsuMatchSnapshot>`.

- [ ] **Step 1: Write a pagination/normalization test**

Mock `v2.matches.details` with two pages: first has events 1–100 and `latest_event_id: 101`, second has event 101 and `match.end_time`. Assert calls use `after: 0`, then `after: 100`; duplicate game IDs are deduplicated; nullable game/match end times normalize to `Date | null`; upstream `error` is thrown.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter backend test -- osu-match.spec.ts --runInBand`

Expected: FAIL because `getMatchSnapshot` is missing.

- [ ] **Step 3: Implement complete pagination behind the existing infrastructure service**

Use `v2.matches.details({ match_id: osuMatchId, after, limit: 100 })`. Start with `after = 0`; merge `event.game` by game ID; advance to the maximum event ID; stop only when it reaches `latest_event_id`. Throw if a page makes no progress, preventing an infinite loop. Return only normalized fields required by the calculator.

`OsuMatchClient` remains a thin injectable adapter:

```ts
@Injectable()
export class OsuMatchClient {
  constructor(private readonly osu: OsuService) {}
  get(osuMatchId: number) {
    return this.osu.getMatchSnapshot({ osuMatchId });
  }
}
```

- [ ] **Step 4: Run focused tests and build**

Run: `pnpm --filter backend test -- osu-match.spec.ts --runInBand`

Expected: PASS.

Run: `pnpm --filter backend build`

Expected: exit 0 with `osu-api-extended@3.1.8` types.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/infrastructure/osu apps/backend/src/modules/match-sync/osu-match.client.ts
git commit -m "feat: fetch osu multiplayer snapshots"
```

### Task 4: PostgreSQL lease repository and atomic result writes

**Files:**
- Create: `apps/backend/src/modules/match-sync/match-sync.repository.ts`
- Create: `apps/backend/test/match-sync.repository.e2e-spec.ts`
- Modify: `apps/backend/test/jest-e2e.json`

**Interfaces:**
- Produces: `claimDue(limit, leaseMs): Promise<SyncLease[]>`.
- Produces: `claimOne(matchId, leaseMs): Promise<SyncLease | null>`.
- Produces: `loadInput(matchId): Promise<MatchCalculationInput>`.
- Produces: `completeSuccess(lease: SyncLease, players: MatchPlayerIdentity[], points: ReadonlyMap<number, number>, closedAt: Date | null, mode: SyncMode): Promise<boolean>`.
- Produces: `completeFailure(lease: SyncLease, error: unknown, mode: SyncMode): Promise<boolean>`.
- Produces: `getState(matchId)` and `stop(matchId)`.

- [ ] **Step 1: Write real PostgreSQL concurrency tests**

Use two Nest application contexts (therefore two pools) against the test database. Insert one tournament/stage/mappool/two users/match/participants/sync fixture in `beforeEach`, and delete that fixture in `afterEach`. Assert:

```ts
const [left, right] = await Promise.all([
  repositoryA.claimDue(1, 60_000),
  repositoryB.claimDue(1, 60_000),
]);
expect(left.length + right.length).toBe(1);

await sqlClient.query(`update match_osu_sync set lease_until = now() - interval '1 second'`);
expect(await repositoryB.claimDue(1, 60_000)).toHaveLength(1);
```

Also test that `completeSuccess` with an old token returns `false`, stop prevents a late write, the eligible beatmap query is scoped through `matches.stage_id -> mappools.stage_id`, and completion updates both participant rows plus sync status in one transaction.

- [ ] **Step 2: Run e2e test to verify failure**

Run: `docker compose -f apps/infra/docker-compose.yml up -d postgres`

Run: `pnpm --filter backend test:e2e -- match-sync.repository.e2e-spec.ts --runInBand`

Expected: FAIL because repository is missing.

- [ ] **Step 3: Implement atomic claims and fenced writes**

Claim inside a short DB transaction. Select due rows ordered by `next_sync_at` using `FOR UPDATE SKIP LOCKED`, then assign each row `crypto.randomUUID()`, `lease_until = now + leaseMs`, and return `{ matchId, osuMatchId, leaseToken, status }`. Never hold the transaction open across an osu HTTP request.

`loadInput` must return exactly two participant pairs `{ userId, osuId }` and a `Set<number>` of beatmaps from the match stage's single mappool. Throw a match-domain conflict when participants or mappool are missing.

In `completeSuccess`, lock `match_osu_sync FOR UPDATE`, compare token, update participant scores by `userId`, derive `isWinner`, then:

- background + closed snapshot: status `completed`, clear lease;
- background + open snapshot: keep `active`, set `nextSyncAt = now + poll interval`, clear lease;
- manual: preserve prior status and clear lease.

In `completeFailure`, compare token, store a bounded error string, increment attempts, clear lease and set `nextSyncAt` for active background work using:

```ts
Math.min(maxBackoffMs, pollIntervalMs * 2 ** Math.min(attempts, 8));
```

- [ ] **Step 4: Run concurrency tests**

Run: `pnpm --filter backend test:e2e -- match-sync.repository.e2e-spec.ts --runInBand`

Expected: PASS, including two-replica claim and stale-token cases.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/match-sync/match-sync.repository.ts apps/backend/test
git commit -m "feat: coordinate match sync through postgres leases"
```

### Task 5: Shared syncOnce use case and NestJS Scheduler

**Files:**
- Create: `apps/backend/src/modules/match-sync/match-sync.service.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync.service.spec.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync.scheduler.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync.scheduler.spec.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Produces: `syncOnce(lease: SyncLease, mode: 'background' | 'manual'): Promise<MatchSyncResult>`.
- Produces: `syncMatchOnce(matchId: MatchId): Promise<MatchSyncResult>` for POST.
- Produces: `MatchSyncScheduler.tick(): Promise<void>` invoked by `@Interval(1_000)`.

- [ ] **Step 1: Write orchestration tests**

Mock repository/client/calculator and assert: successful open background sync reschedules, closed sync completes, API failure calls `completeFailure`, manual claim conflict throws `409`, and scheduler uses `Promise.allSettled` so one failed match does not abort the batch.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter backend test -- 'match-sync\.(service|scheduler)\.spec\.ts' --runInBand`

Expected: FAIL because service and scheduler are missing.

- [ ] **Step 3: Implement the minimal orchestration**

```ts
async syncOnce(lease: SyncLease, mode: SyncMode) {
  try {
    const input = await this.repository.loadInput(lease.matchId);
    const snapshot = await this.client.get(lease.osuMatchId);
    const points = calculateMatchPoints({
      snapshot,
      playerOsuIds: input.players.map((player) => player.osuId) as [number, number],
      allowedBeatmapIds: input.allowedBeatmapIds,
    });
    const written = await this.repository.completeSuccess(lease, input.players, points, snapshot.closedAt, mode);
    if (!written) throw new ConflictException('Match sync lease expired');
    return this.repository.getState(lease.matchId);
  } catch (error) {
    await this.repository.completeFailure(lease, error, mode);
    throw error;
  }
}
```

`syncMatchOnce` calls `claimOne`; `tick` calls `claimDue(batchSize, leaseMs)` and handles every returned lease. Register `ScheduleModule.forRoot()` and `MatchSyncModule` in `AppModule`.

- [ ] **Step 4: Run focused tests and build**

Run: `pnpm --filter backend test -- 'match-sync\.(service|scheduler)\.spec\.ts' --runInBand`

Expected: PASS.

Run: `pnpm --filter backend build`

Expected: exit 0 and Nest resolves all providers.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/match-sync apps/backend/src/app.module.ts
git commit -m "feat: schedule osu match synchronization"
```

### Task 6: Match lifecycle, authorization and REST API

**Files:**
- Create: `apps/backend/src/modules/match-sync/match-sync-lifecycle.service.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync-lifecycle.service.spec.ts`
- Create: `apps/backend/src/modules/match-sync/match-sync.controller.ts`
- Create: `apps/backend/src/modules/match-sync/dto/index.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.module.ts`
- Modify: `apps/backend/src/modules/match/match.module.ts`
- Modify: `apps/backend/src/modules/match/match.service.ts`
- Modify: `apps/backend/src/modules/match/dto/index.ts`
- Modify: `apps/backend/src/modules/match/schedule.service.ts`
- Modify: `apps/backend/src/modules/auth/policies/resolvers/match-policy-context.resolver.ts`
- Modify: `apps/backend/src/modules/auth/policies/ability.factory.ts`
- Modify: `apps/backend/src/lib/domain/match/match.exception.ts`
- Create: `apps/backend/test/match-sync.api.e2e-spec.ts`

**Interfaces:**
- Produces: `GET|POST|DELETE /matches/:matchId/sync`.
- Produces: public `syncStatus` and `lastSyncedAt` in every schedule match.
- Produces: automatic activation on new/changed valid `mpUrl` and stop on removal.

- [ ] **Step 1: Write lifecycle and API tests**

Test exact URL formats, changed versus unchanged link, removal, active score conflict, stopped score write invalidating lease, host/admin access, unrelated user `403`, archived tournament `403`, one-shot POST preserving stopped/completed, DELETE changing active to stopped, and public schedule status fields.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter backend test -- match-sync-lifecycle.service.spec.ts --runInBand`

Run: `pnpm --filter backend test:e2e -- match-sync.api.e2e-spec.ts --runInBand`

Expected: FAIL because lifecycle/controller/DTO are missing.

- [ ] **Step 3: Implement lifecycle in the existing match transaction**

Expose lifecycle methods accepting the current Drizzle transaction:

```ts
prepareCreate(tx, matchId, mpUrl): Promise<void>
prepareUpdate(tx, matchId, previousMpUrl, nextMpUrl, players): Promise<void>
stop(matchId): Promise<MatchSyncState>
```

When URL is added/changed, parse it and upsert `active`; when removed, set `stopped`. For unchanged active URL, lock the sync row and reject only actual score changes with `MATCH_SYNC_ACTIVE` (`409`), while allowing metadata edits. When manual scores are accepted, clear `lease_token/lease_until` before replacing participants. Keep `replaceParticipants` and sync state mutation inside the same transaction.

Add `.min(0)` to backend score schemas. Derive winner exactly once in the existing `resolveWinnerIds` path.

- [ ] **Step 4: Implement direct match policy resolution and controller**

Extend the resolver to recognize `/matches/:matchId/sync`, join `matches -> stages -> tournaments`, reject deleted stage/archived tournament, and return `MatchSubjectData`. Keep existing nested tournament match routes working.

Controller contract:

```ts
@Controller('matches')
export class MatchSyncController {
  @Get(':matchId/sync') getState(...) {}
  @Post(':matchId/sync') syncOnce(...) {}
  @Delete(':matchId/sync') stop(...) {}
}
```

All three routes use JWT + policies; GET checks `read`, POST checks `update`, DELETE checks `delete`. Add host `read` permission for `Match`.

Extend schedule SQL JSON with `syncStatus` and `lastSyncedAt` via a left join/subquery on `match_osu_sync` without exposing `lastError` publicly.

- [ ] **Step 5: Run all backend tests**

Run: `pnpm --filter backend test --runInBand`

Expected: PASS.

Run: `pnpm --filter backend test:e2e -- match-sync.api.e2e-spec.ts --runInBand`

Expected: PASS.

Run: `pnpm --filter backend build`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules apps/backend/src/lib/domain/match apps/backend/test
git commit -m "feat: expose osu match sync lifecycle"
```

### Task 7: Generated client, REST polling and host controls

**Files:**
- Modify: `apps/frontend/openapi/backend.json`
- Modify: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`
- Modify: `apps/frontend/src/lib/api/generated/model/index.ts`
- Create generated models: `apps/frontend/src/lib/api/generated/model/matchSyncDto.ts` and updated schedule match models.
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/lib/types/tournament-edit-action.ts`
- Create: `apps/frontend/src/lib/utils/active-sync-poller.ts`
- Create: `apps/frontend/src/lib/utils/active-sync-poller.test.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Modify: `apps/frontend/src/lib/components/schedule/schedule-view.ts`
- Modify: `apps/frontend/src/lib/components/match/types.ts`

**Interfaces:**
- Consumes: generated `matchSyncControllerGetState`, `matchSyncControllerSyncOnce`, `matchSyncControllerStop` endpoints.
- Produces: `createActiveSyncPoller(refresh, intervalMs)` with `setActive(boolean)` and `destroy()`.

- [ ] **Step 1: Refresh OpenAPI and generated server client**

Run backend locally, then run: `pnpm --filter frontend api:refresh`

Expected: generated endpoints for all three direct match sync routes and schedule models containing nullable `syncStatus/lastSyncedAt`.

- [ ] **Step 2: Write the polling lifecycle test**

Use injected `setInterval/clearInterval` fakes. Assert `setActive(true)` creates one timer, repeated true does not duplicate it, false clears it, destroy clears it, and the timer invokes refresh.

Run: `pnpm --filter frontend test:infra -- active-sync-poller.test.ts`

Expected: FAIL because helper is missing.

- [ ] **Step 3: Implement the polling helper and wire both schedule tabs**

```ts
export function createActiveSyncPoller(refresh: () => void, intervalMs = 10_000) {
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    setActive(active: boolean) {
      if (active && !timer) timer = setInterval(refresh, intervalMs);
      if (!active && timer) { clearInterval(timer); timer = undefined; }
    },
    destroy() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
```

In both `ScheduleTab.svelte` components, create it in `onMount`, call `setActive(schedule.some(stage => stage.matches.some(match => match.syncStatus === 'active')))` reactively, invoke `invalidateAll` on a tick, and destroy in `onDestroy`.

- [ ] **Step 4: Add host commands/actions without browser tokens**

Add backend client methods `getSync`, `syncOnce`, `stopSync`. Add SvelteKit form actions `syncScheduleMatch` and `stopScheduleMatch`, both requiring session and returning the existing `TournamentEditActionResult` shape. The edit query loads host-only sync diagnostics for matches with an `mpUrl` into `syncByMatchId`.

In edit `ScheduleTab`, add compact one-shot and stop forms beside Edit/Delete. Disable stop unless active. Show `lastError/lastSyncedAt` in `ScheduleMatchForm`; disable both score inputs while `match.syncStatus === 'active'`. Do not call backend directly from the browser.

- [ ] **Step 5: Run frontend tests and checks**

Run: `pnpm --filter frontend test:infra -- active-sync-poller.test.ts`

Expected: PASS.

Run: `pnpm --filter frontend check`

Expected: 0 errors and 0 warnings introduced by these files.

Run: `pnpm --filter frontend api:check`

Expected: exit 0 with no generated client diff.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/openapi apps/frontend/src
git commit -m "feat: display and control osu match sync"
```

### Task 8: End-to-end recovery and final verification

**Files:**
- Modify: `apps/backend/test/match-sync.api.e2e-spec.ts`
- Modify: `apps/backend/test/match-sync.repository.e2e-spec.ts`
- Modify: `apps/frontend/src/lib/utils/active-sync-poller.test.ts`

**Interfaces:**
- Validates the complete feature; produces no new runtime abstraction.

- [ ] **Step 1: Add the final regression scenarios**

Add tests for: process A claims then its lease expires and process B completes; process A's later response cannot overwrite B; stop during an upstream request prevents the late write; manual score after stop invalidates an in-flight manual one-shot; closed lobby is never claimed again; changing mappool while active changes the next full recalculation; changing it after completed does not.

- [ ] **Step 2: Run the complete verification matrix**

Run: `pnpm --filter backend test --runInBand`

Expected: PASS.

Run: `pnpm --filter backend test:e2e --runInBand`

Expected: PASS against PostgreSQL 17.

Run: `pnpm --filter backend build`

Expected: exit 0.

Run: `pnpm --filter frontend test:infra`

Expected: PASS.

Run: `pnpm --filter frontend check`

Expected: exit 0.

Run: `pnpm --filter frontend build`

Expected: exit 0.

- [ ] **Step 3: Perform a two-replica smoke check**

Start PostgreSQL, run two backend instances against the same database on different HTTP ports, assign one open osu lobby URL, and inspect `match_osu_sync`: only one lease token exists per match, scores change through REST, stopping prevents further background writes, and killing the lease owner allows the other instance to continue after `lease_until`.

- [ ] **Step 4: Commit test hardening**

```bash
git add apps/backend/test apps/frontend/src/lib/utils/active-sync-poller.test.ts
git commit -m "test: verify replicated osu match sync recovery"
```

---

## Deferred by design

- Separate worker extraction: move `match-sync` module when deployment isolation is actually needed; current boundaries already permit it.
- NATS events, WebSocket updates, persisted osu game history and metrics dashboards: add only when a measured operational need appears.
- Automatic permanent failure state: bounded retries plus visible `lastError` preserve recovery from transient osu outages without another lifecycle branch.
