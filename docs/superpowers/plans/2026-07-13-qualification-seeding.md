# Qualification Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import qualification lobby attempts, calculate solo or team seeds, and let tournament hosts edit seeds and withdrawal state.

**Architecture:** Mark one stage per tournament as `qualification`, branch the existing osu match synchronizer for that stage, and persist normalized per-game player attempts. A pure calculator ranks active solo registrations or teams, while `TournamentService` owns transactional seed writes and host-only roster edits; the SvelteKit editor reuses the existing stages, schedule, and form-action patterns.

**Tech Stack:** NestJS 11, Drizzle ORM 0.45, PostgreSQL, Zod 4, Jest 30, SvelteKit 2, Svelte 5, Orval 8, pnpm.

## Global Constraints

- A tournament has at most one non-deleted qualification stage.
- Qualification attempts include only completed games on the qualification mappool.
- Solo uses each player's best score per map; team uses the best same-game sum of all registered members per map.
- Missing map scores are zero and equal map scores use competition ranking (`1, 1, 3`).
- Seed order is average place ascending, best-score sum descending, then osu user ID/team ID ascending.
- Recalculation assigns unique consecutive seeds to active competitors and clears withdrawn competitors' seeds.
- A withdrawn team member's imported scores still count while the team is active.
- Recalculation overwrites manual seed edits.
- Add no dependency and do not add a public leaderboard, attempts browser, CSV support, or configurable formula.

---

### Task 1: Persist qualification stage, attempts, seeds, and withdrawals

**Files:**
- Create: `apps/backend/src/lib/domain/stage/stage.type.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/stages/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/participants/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/teams/index.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/teams/participants.ts`
- Create: `apps/backend/src/lib/infrastructure/db/matches/qualification-attempts.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/schema.ts`
- Modify: `apps/backend/src/modules/match/schedule.service.ts`
- Create: `apps/backend/drizzle/0018_qualification_seeding.sql`
- Modify: `apps/backend/drizzle/meta/_journal.json`
- Create: `apps/backend/drizzle/meta/0010_snapshot.json` through `0017_snapshot.json`
- Create: `apps/backend/drizzle/meta/0018_snapshot.json`

**Interfaces:**
- Produces: `StageType = 'regular' | 'qualification'`, `qualificationAttempts`, solo/team `seed`, `withdrawn`, and `withdrawalReason` columns.
- Consumes: existing `matches`, `stages`, `soloParticipants`, `teams`, and `teamParticipants` tables.

- [ ] **Step 1: Add the schema fields and attempts table**

Define the shared domain type first:

```ts
import z from 'zod';

export const stageTypeSchema = z.enum(['regular', 'qualification']);
export type StageType = z.infer<typeof stageTypeSchema>;
```

Import `StageType` from that file in the stage table. Use the existing Drizzle table style. The new attempts table is:

```ts
export const qualificationAttempts = pgTable(
  'qualification_attempts',
  {
    matchId: text('match_id')
      .notNull()
      .$type<MatchId>()
      .references(() => matches.id, { onDelete: 'cascade' }),
    osuGameId: bigint('osu_game_id', { mode: 'number' }).notNull(),
    beatmapId: text('beatmap_id')
      .notNull()
      .$type<BeatmapId>()
      .references(() => beatmaps.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    score: integer('score').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.osuGameId, table.userId] }),
    index('qualification_attempts_map_user_idx').on(
      table.beatmapId,
      table.userId,
    ),
  ],
);
```

Add `type: text('type').$type<StageType>().notNull().default('regular')` to stages. Declare the invariant in the Drizzle table as well as the migration:

```ts
uniqueIndex('stages_one_qualification_per_tournament')
  .on(table.tournamentId)
  .where(sql`${table.deletedAt} IS NULL AND ${table.type} = 'qualification'`)
```

Add `withdrawn: boolean('withdrawn').notNull().default(false)` and `withdrawalReason: text('withdrawal_reason')` to solo participants, teams, and team participants. Keep `seed` on solo participants, add team seed to `teams`, and retain the legacy `teamParticipants.seed` column for compatibility and data safety. Do not expose or use member seed in new UI or calculation code.

Remove the `team_participants.seed` fallback from `ScheduleService`; regular team matches already display aggregate team scores, and individual team members no longer own seeds.

- [ ] **Step 2: Generate the migration**

Run in `apps/backend`:

```bash
pnpm migration:generate --name qualification_seeding
```

First reconstruct missing snapshots 10–17 by running Drizzle generation sequentially against their exact historical schema commits, retaining the command-generated snapshots and journal without editing their contents. Preserve the old SQL migrations. Then run the command above from the current schema.

Expected: `0018_qualification_seeding.sql`, journal entry `idx: 18`, and `0018_snapshot.json` are created. Keep generated artifacts verbatim and verify the generated SQL includes the active-stage invariant:

```sql
CREATE UNIQUE INDEX "stages_one_qualification_per_tournament"
ON "stages" USING btree ("tournament_id")
WHERE "stages"."deleted_at" IS NULL AND "stages"."type" = 'qualification';
```

- [ ] **Step 3: Verify schema compilation**

Run in `apps/backend`:

```bash
pnpm run build
```

Expected: exit 0 with `qualificationAttempts` exported from `lib/infrastructure/db/schema.ts`.

- [ ] **Step 4: Commit the persistence boundary**

```bash
git add apps/backend/src/lib/infrastructure/db apps/backend/drizzle
git commit -m "feat: persist qualification state"
```

---

### Task 2: Enforce the qualification stage and lobby shape

**Files:**
- Modify: `apps/backend/src/lib/domain/stage/stage.exception.ts`
- Modify: `apps/backend/src/modules/stage/dto/index.ts`
- Modify: `apps/backend/src/modules/stage/types/index.ts`
- Create: `apps/backend/src/modules/stage/stage.service.spec.ts`
- Modify: `apps/backend/src/modules/stage/stage.service.ts`
- Modify: `apps/backend/src/modules/match/match.service.spec.ts`
- Modify: `apps/backend/src/modules/match/match.service.ts`
- Modify: `apps/backend/src/modules/match/dto/index.ts`

**Interfaces:**
- Consumes: `StageType` and the database uniqueness invariant from Task 1.
- Produces: stage DTO field `type`; qualification matches require an mp URL and no selected players or teams.

- [ ] **Step 1: Write failing stage DTO and service tests**

Add DTO assertions that `createStageDtoSchema` defaults `type` to `regular` and accepts `qualification`. Add a service test with a fake query returning an existing active qualification stage:

```ts
await expect(
  service.create({
    tournamentId,
    name: 'Qualifier',
    type: 'qualification',
    startsAt,
    endsAt,
  }),
).rejects.toMatchObject({
  internalErrorCode: StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
});
```

Run:

```bash
pnpm test -- stage.service.spec.ts --runInBand
```

Expected: FAIL because stage type and conflict code do not exist.

- [ ] **Step 2: Add stage type and the friendly conflict**

Import and reuse the domain schema from Task 1:

```ts
import { stageTypeSchema } from 'lib/domain/stage/stage.type';
```

Include `type` in `stageDtoSchema`, default it in create, and allow it in update. Before inserting or changing a stage to qualification, query for another non-deleted qualification stage in the tournament and throw:

```ts
throw new StageException(
  'Tournament already has a qualification stage',
  StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
);
```

Map that code to HTTP 409. The unique index remains the concurrency backstop; catch PostgreSQL code `23505` with constraint `stages_one_qualification_per_tournament` and translate it to the same exception.

- [ ] **Step 3: Write failing match-shape tests**

Cover both tournament modes with a qualification stage returned from the fake database:

```ts
await expect(
  service.createScheduleMatch({
    tournamentId,
    data: qualificationData({ mpUrl: null }),
  }),
).rejects.toThrow('Qualification lobby requires an mp URL');

await expect(
  service.createScheduleMatch({
    tournamentId,
    data: qualificationData({ mpUrl, players: [player] }),
  }),
).rejects.toThrow('Qualification lobby cannot select competitors');
```

Run:

```bash
pnpm test -- match.service.spec.ts --runInBand
```

Expected: both new cases fail.

- [ ] **Step 4: Validate qualification matches in the shared service path**

Change `assertStageBelongsToTournament` to return the stage. Pass it to competitor validation for both create and update:

```ts
if (stage.type === 'qualification') {
  if (!data.mpUrl)
    throw new MatchException(
      'Qualification lobby requires an mp URL',
      MatchExceptionCode.MATCH_ACCESS_DENIED,
    );
  if (data.players.length || data.redTeamId || data.blueTeamId)
    throw new MatchException(
      'Qualification lobby cannot select competitors',
      MatchExceptionCode.MATCH_ACCESS_DENIED,
    );
  return;
}
```

Regular match behavior remains byte-for-byte equivalent. Keep the request DTO permissive because stage type is database state and belongs in service validation.

- [ ] **Step 5: Run backend tests and commit**

```bash
pnpm test -- stage.service.spec.ts match.service.spec.ts --runInBand
pnpm run build
git add src/lib/domain/stage src/modules/stage src/modules/match
git commit -m "feat: add qualification stages and lobbies"
```

Working directory: `apps/backend`. Expected: tests and build exit 0.

---

### Task 3: Import every qualification attempt idempotently

**Files:**
- Create: `apps/backend/src/modules/match-sync/qualification-attempts.ts`
- Create: `apps/backend/src/modules/match-sync/qualification-attempts.spec.ts`
- Modify: `apps/backend/src/modules/match-sync/types.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.repository.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.service.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.service.spec.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.repository.spec.ts`

**Interfaces:**
- Consumes: `OsuMatchSnapshot`, stage type, allowed osu beatmap IDs, and `qualificationAttempts`.
- Produces: `QualificationMatchSyncInput`, raw extracted osu attempt metadata, and normalized persisted `{ osuGameId, beatmapId, userId, score }[]` for every completed allowed game whose beatmap and user resolve locally.

- [ ] **Step 1: Write the failing pure extraction test**

```ts
expect(
  extractQualificationAttempts(snapshot, new Set([101])),
).toEqual([
  { osuGameId: 1, osuBeatmapId: 101, osuUserId: 10, score: 900000 },
  { osuGameId: 1, osuBeatmapId: 101, osuUserId: 20, score: 800000 },
  { osuGameId: 4, osuBeatmapId: 101, osuUserId: 10, score: 950000 },
]);
```

The fixture also contains an unfinished game and a completed map outside the allowed set; neither appears.

Run:

```bash
pnpm test -- qualification-attempts.spec.ts --runInBand
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement the one-pass extractor**

```ts
export function extractQualificationAttempts(
  snapshot: OsuMatchSnapshot,
  allowedBeatmapIds: ReadonlySet<number>,
): QualificationAttemptInput[] {
  return snapshot.games.flatMap((game) =>
    game.endedAt && allowedBeatmapIds.has(game.beatmapId)
      ? game.scores.map(({ userId, score }) => ({
          osuGameId: game.id,
          osuBeatmapId: game.beatmapId,
          osuUserId: userId,
          score,
        }))
      : [],
  );
}
```

Run the targeted test again. Expected: PASS.

- [ ] **Step 3: Add qualification sync input and repository loading**

Extend the union:

```ts
export type QualificationMatchSyncInput = {
  kind: 'qualification';
  allowedBeatmapIds: Set<number>;
};
```

Make `loadInput()` select `stages.type` with the match. Return the qualification input before the regular solo/team participant checks. This is the single switch that permits arbitrary lobby members.

Keep raw osu IDs only at the match-client boundary. Before persistence, resolve the extracted osu beatmap IDs through `beatmaps.osuBeatmapId` and osu user IDs through `users.osuId`. Ignore attempts whose user is unknown; allowed maps already resolve to a beatmap row. This keeps `qualification_attempts` normalized while still accepting arbitrary lobby snapshots.

- [ ] **Step 4: Persist attempts in the fenced success transaction**

In `MatchSyncService.syncOnce`, extract attempts only for `input.kind === 'qualification'`; keep `calculateMatchPoints` for the other two kinds. Make `applySuccess` a correlated union so points cannot be absent for regular matches:

```ts
type ApplySuccessParams = {
  lease: SyncLease;
  closedAt: Date | null;
  background: boolean;
} & (
  | { input: QualificationMatchSyncInput; attempts: QualificationAttemptInput[] }
  | { input: SoloMatchSyncInput | TeamMatchSyncInput; points: MatchSyncPoints }
);
```

Inside its existing lease-fenced transaction:

```ts
if (params.input.kind === 'qualification') {
  if (params.attempts?.length) {
    const beatmapIdsByOsuId = await loadBeatmapIdsByOsuId(tx, params.attempts);
    const userIdsByOsuId = await loadUserIdsByOsuId(tx, params.attempts);
    const values = params.attempts.flatMap((attempt) => {
      const beatmapId = beatmapIdsByOsuId.get(attempt.osuBeatmapId);
      const userId = userIdsByOsuId.get(attempt.osuUserId);
      return beatmapId && userId
        ? [{
            matchId: params.lease.matchId,
            osuGameId: attempt.osuGameId,
            beatmapId,
            userId,
            score: attempt.score,
          }]
        : [];
    });
    if (values.length) {
      await tx
        .insert(qualificationAttempts)
        .values(values)
        .onConflictDoUpdate({
          target: [
            qualificationAttempts.matchId,
            qualificationAttempts.osuGameId,
            qualificationAttempts.userId,
          ],
          set: {
            beatmapId: sql`excluded.beatmap_id`,
            score: sql`excluded.score`,
            updatedAt: new Date(),
          },
        });
    }
  }
} else if (params.input.kind === 'team') {
  await tx.update(matches).set({
    redScore: params.points.redScore,
    blueScore: params.points.blueScore,
  }).where(eq(matches.id, params.lease.matchId));
} else {
  const [first, second] = params.input.players;
  const firstWins = params.points.redScore === params.points.blueScore
    ? null
    : params.points.redScore > params.points.blueScore;
  const secondWins = params.points.redScore === params.points.blueScore
    ? null
    : params.points.blueScore > params.points.redScore;
  await tx.update(matchParticipants).set({
    score: params.points.redScore,
    isWinner: firstWins,
  }).where(and(
    eq(matchParticipants.matchId, params.lease.matchId),
    eq(matchParticipants.userId, first.userId),
  ));
  await tx.update(matchParticipants).set({
    score: params.points.blueScore,
    isWinner: secondWins,
  }).where(and(
    eq(matchParticipants.matchId, params.lease.matchId),
    eq(matchParticipants.userId, second.userId),
  ));
}
```

Keep the existing status, retry, lease, and closed-lobby behavior unchanged.

- [ ] **Step 5: Verify repeated import and regular regression behavior**

Repository tests assert the conflict target and that qualification import never updates `matches.redScore`, `matches.blueScore`, or `matchParticipants`. Service tests assert regular solo and team calls still use `calculateMatchPoints` behavior.

Run in `apps/backend`:

```bash
pnpm test -- qualification-attempts.spec.ts match-sync.service.spec.ts match-sync.repository.spec.ts --runInBand
pnpm run build
```

Expected: all exit 0.

- [ ] **Step 6: Commit qualification import**

```bash
git add apps/backend/src/modules/match-sync
git commit -m "feat: import qualification attempts"
```

---

### Task 4: Calculate deterministic solo and team seeds

**Files:**
- Create: `apps/backend/src/modules/tournament/qualification-seeding.ts`
- Create: `apps/backend/src/modules/tournament/qualification-seeding.spec.ts`

**Interfaces:**
- Consumes: mappool beatmap IDs, active competitors with one or more internal user IDs, and persisted normalized attempts.
- Produces: `calculateQualificationSeeds(input): CalculatedSeed[]` where each result has `competitorId`, `seed`, `averagePlace`, and `totalScore`.

- [ ] **Step 1: Write one table-driven failing calculator test**

Use a fixture containing three maps, multiple games/lobbies, a missing map, an equal map score, and a team with two members. Assert these independently:

```ts
expect(result.map(({ competitorId, seed }) => ({ competitorId, seed }))).toEqual([
  { competitorId: 'C', seed: 1 },
  { competitorId: 'A', seed: 2 },
  { competitorId: 'B', seed: 3 },
]);
expect(byId.get('A')?.averagePlace).toBeCloseTo(5 / 3);
```

Add a second assertion where equal average place is resolved by larger total score and a third where exact equality is resolved by `tieBreakId`.

Run:

```bash
pnpm test -- qualification-seeding.spec.ts --runInBand
```

Expected: FAIL because the calculator does not exist.

- [ ] **Step 2: Implement one generic calculator**

Use these inputs so solo and team share all ranking code:

```ts
export type QualificationCompetitor = {
  id: string;
  tieBreakId: string | number;
  userIds: readonly string[];
};

export type QualificationAttempt = {
  osuGameId: number;
  beatmapId: string;
  userId: string;
  score: number;
};
```

Implementation outline with no additional classes:

```ts
const members = new Set(competitor.userIds);
const gameTotalsByMap = new Map<string, Map<number, number>>();
for (const attempt of attempts) {
  if (!members.has(attempt.userId)) continue;
  const gameTotals = gameTotalsByMap.get(attempt.beatmapId) ?? new Map();
  gameTotals.set(
    attempt.osuGameId,
    (gameTotals.get(attempt.osuGameId) ?? 0) + attempt.score,
  );
  gameTotalsByMap.set(attempt.beatmapId, gameTotals);
}
const bestByMap = new Map(beatmapIds.map((id) => [id, 0]));
for (const [beatmapId, gameTotals] of gameTotalsByMap) {
  bestByMap.set(beatmapId, Math.max(...gameTotals.values()));
}
```

For each map, sort scores descending and assign `place = index + 1` only when the score differs from the previous row. Accumulate `placeSum` and `totalScore`; sort by `placeSum`, then `totalScore` descending, then this stable comparator:

```ts
const compareTieBreak = (left: string | number, right: string | number) =>
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));
```

Divide `placeSum` by map count only for the returned display value. Assign `seed = index + 1` after sorting.

- [ ] **Step 3: Run calculator tests and commit**

```bash
pnpm test -- qualification-seeding.spec.ts --runInBand
git add src/modules/tournament/qualification-seeding.ts src/modules/tournament/qualification-seeding.spec.ts
git commit -m "feat: calculate qualification seeds"
```

Working directory: `apps/backend`. Expected: PASS.

---

### Task 5: Add host roster editing and transactional recalculation API

**Files:**
- Modify: `apps/backend/src/modules/tournament/dto/index.ts`
- Modify: `apps/backend/src/modules/tournament/dto/index.spec.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.spec.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Modify: `apps/backend/src/modules/auth/policies/resolvers/tournament-policy-context.resolver.ts`
- Create: `apps/backend/src/modules/auth/policies/resolvers/tournament-policy-context.resolver.spec.ts`

**Interfaces:**
- Consumes: `calculateQualificationSeeds` from Task 4 and persisted state from Task 1/3.
- Produces: management roster response, three narrow edit endpoints, and `POST /tournaments/:id/qualification/calculate-seeds`.

- [ ] **Step 1: Write failing request/response schema tests**

Define:

```ts
export const updateQualificationCompetitorDtoSchema = z.object({
  seed: z.number().int().positive().nullable().optional(),
  withdrawn: z.boolean().optional(),
  withdrawalReason: z.string().trim().max(1000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');
```

Add a discriminated management response:

```ts
z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solo'), participants: z.array(managedSoloSchema) }),
  z.object({ kind: z.literal('team'), teams: z.array(managedTeamSchema) }),
]);
```

Managed user fields are `id`, `osuId`, `osuUsername`, `avatarUrl`, `withdrawn`, and `withdrawalReason`; solo adds `seed`; team adds `id`, `name`, `seed`, `withdrawn`, `withdrawalReason`, and `participants`.

Run:

```bash
pnpm test -- dto/index.spec.ts --runInBand
```

Expected: new schema imports fail.

- [ ] **Step 2: Implement roster reads and narrow updates**

Add service methods with exact signatures:

```ts
getQualificationRoster(params: { id: TournamentId }): Promise<QualificationRosterInput>
updateSoloQualificationParticipant(params: { id: TournamentId; userId: UserId; data: UpdateQualificationCompetitorInput }): Promise<void>
updateQualificationTeam(params: { id: TournamentId; teamId: TeamId; data: UpdateQualificationCompetitorInput }): Promise<void>
updateQualificationTeamParticipant(params: { id: TournamentId; teamId: TeamId; userId: UserId; data: Omit<UpdateQualificationCompetitorInput, 'seed'> }): Promise<void>
```

Each update includes tournament ownership in its SQL predicate/join. Apply the clearing rule centrally:

```ts
const withdrawalReason = data.withdrawn === false ? null : data.withdrawalReason;
```

If no row returns, throw `TournamentExceptionCode.TOURNAMENT_NOT_FOUND` with a scoped participant/team message. Do not alter public participant DTOs.

- [ ] **Step 3: Write the failing transactional recalculation test**

Fake one transaction containing an active roster, qualification mappool maps, and attempts. Spy on the pure calculator and assert writes:

```ts
expect(updateActive).toHaveBeenCalledWith([{ id: activeId, seed: 1 }]);
expect(clearWithdrawn).toHaveBeenCalledWith([{ id: withdrawnId, seed: null }]);
```

Add failure cases for no qualification stage and empty mappool and assert no update is called.

Run:

```bash
pnpm test -- tournament.service.spec.ts --runInBand
```

Expected: FAIL because `calculateQualificationSeeds` service method is absent.

- [ ] **Step 4: Implement one transactional recalculation method**

Add:

```ts
calculateQualificationSeeds(params: { id: TournamentId }): Promise<QualificationRosterInput>
```

Within one Drizzle transaction:

1. Load the non-deleted qualification stage and its mappool internal beatmap IDs; throw `BadRequestException` if either is missing or empty.
2. Load all attempts belonging to matches in that stage.
3. For solo, load active registrations and call the pure calculator with one internal user ID per competitor and the joined osu ID as `tieBreakId`; clear all tournament seeds, then write calculated seeds.
4. For team, load active teams and every member without filtering member withdrawal, call the pure calculator with all internal member user IDs; clear all tournament team seeds, then write calculated seeds.
5. Return `getQualificationRoster({ id })` after the transaction so the response matches the editor read model.

Use one update per calculated row inside the transaction. A batched conditional update is unnecessary until profiling shows participant count makes these writes material.

- [ ] **Step 5: Secure management reads and nested tournament POST routes correctly**

The current resolver treats every POST under `/tournaments` as tournament creation. Restrict that branch to the collection route and resolve `params.id` for nested POST/PATCH/DELETE routes:

```ts
const isCollectionPost =
  request.method === 'POST' && /\/tournaments\/?(?:\?.*)?$/.test(route);
if (isCollectionPost) return { subject: 'Tournament', subjectData: { __type: 'Tournament' } };
```

Also support `GET /tournaments/:id/participants/manage` specifically, while leaving public tournament GET routes unguarded:

```ts
const isManagementRead =
  request.method === 'GET' && /\/participants\/manage(?:\/|$)/.test(route);
return isTournamentRoute &&
  (isManagementRead || ['POST', 'PATCH', 'DELETE'].includes(request.method));
```

The resolver tests assert both management GET and `/tournaments/:id/qualification/calculate-seeds` load the tournament creator, and that nested calculation does not return create context.

- [ ] **Step 6: Expose the host-only routes**

Add controller routes using `JwtUserGuard`, `PoliciesGuard`, and `ability.can('update', context.subjectData)`:

```text
GET   /tournaments/:id/participants/manage
PATCH /tournaments/:id/participants/:userId/manage
PATCH /tournaments/:id/teams/:teamId/manage
PATCH /tournaments/:id/teams/:teamId/participants/:userId/manage
POST  /tournaments/:id/qualification/calculate-seeds
```

Use existing `TournamentIdPipe`, `TeamIdPipe`, and `UserIdPipe`. Return the management roster after edit/calculate so SvelteKit invalidation receives a typed success response.

- [ ] **Step 7: Run API tests/build and commit**

```bash
pnpm test -- tournament.service.spec.ts dto/index.spec.ts tournament-policy-context.resolver.spec.ts --runInBand
pnpm run build
git add src/modules/tournament src/modules/auth/policies/resolvers/tournament-policy-context.resolver.ts src/modules/auth/policies/resolvers/tournament-policy-context.resolver.spec.ts
git commit -m "feat: manage qualification seeds and withdrawals"
```

Working directory: `apps/backend`. Expected: all exit 0.

---

### Task 6: Refresh the typed frontend API boundary

**Files:**
- Modify: `apps/frontend/openapi/backend.json`
- Modify: `apps/frontend/src/lib/api/generated/model/*`
- Modify: `apps/frontend/src/lib/server/backend/generated/*`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`

**Interfaces:**
- Consumes: backend OpenAPI emitted by Tasks 2 and 5.
- Produces: generated stage type, management roster/update types, and client methods used by SvelteKit server code.

- [ ] **Step 1: Start backend and refresh OpenAPI**

With the local backend available on its configured port, run in `apps/frontend`:

```bash
pnpm run api:refresh
```

Expected: Orval generates methods for all five management routes and `StageDtoOutput.type`.

- [ ] **Step 2: Add only the small handwritten client grouping**

Expose generated calls under `tournaments.qualification`:

```ts
qualification: {
  getRoster: (id: string) => tournamentControllerGetQualificationRoster(id, options),
  updateSolo: (id: string, userId: string, input: UpdateQualificationCompetitorDto) =>
    tournamentControllerUpdateSoloQualificationParticipant(id, userId, input, options),
  updateTeam: (id: string, teamId: string, input: UpdateQualificationCompetitorDto) =>
    tournamentControllerUpdateQualificationTeam(id, teamId, input, options),
  updateTeamMember: (id: string, teamId: string, userId: string, input: UpdateQualificationTeamParticipantDto) =>
    tournamentControllerUpdateQualificationTeamParticipant(id, teamId, userId, input, options),
  calculate: (id: string) => tournamentControllerCalculateQualificationSeeds(id, options),
},
```

Do not handwrite duplicate DTO interfaces.

- [ ] **Step 3: Verify generated files are reproducible and commit**

```bash
pnpm run api:check
pnpm run check
git add openapi/backend.json src/lib/api/generated src/lib/server/backend
git commit -m "chore: refresh qualification api client"
```

Expected: both commands exit 0 and `api:check` leaves no diff.

---

### Task 7: Add qualification controls to the tournament editor

**Files:**
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.test.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts`
- Modify: `apps/frontend/src/lib/types/tournament-edit-action.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/StagesTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Create: `apps/frontend/src/routes/events/[slug]/edit/components/ParticipantsTab.svelte`

**Interfaces:**
- Consumes: generated types/client methods from Task 6.
- Produces: stage type selector, competitor-free qualification lobby form, and Participants tab forms for seed/withdrawal/calculate.

- [ ] **Step 1: Write failing form-schema tests**

Add tests for stage type and clearing a withdrawal reason:

```ts
expect(stageCreateFormSchema.parse({
  name: 'Qualifier',
  type: 'qualification',
  startsAt,
  endsAt,
}).type).toBe('qualification');

expect(qualificationCompetitorFormSchema.parse({
  seed: '',
  withdrawn: 'false',
  withdrawalReason: 'old reason',
})).toEqual({ seed: null, withdrawn: false, withdrawalReason: null });
```

Run in `apps/frontend`:

```bash
pnpm run test:infra -- tournament-edit.schema.test.ts
```

Expected: FAIL because the schemas do not expose these fields.

- [ ] **Step 2: Add minimal form schemas and server commands**

Extend stage create/update with `type: z.enum(['regular', 'qualification'])`. Add separate schemas for solo/team (`seed`, `withdrawn`, `withdrawalReason`) and member (`withdrawn`, `withdrawalReason`) forms. Transform unchecked values to `false`, blank seed/reason to `null`, and force reason to null when active.

Add action names:

```ts
| 'updateQualificationSolo'
| 'updateQualificationTeam'
| 'updateQualificationTeamMember'
| 'calculateQualificationSeeds'
```

Each command is one direct call to `backend.tournaments.qualification.*`. Wire actions through the existing `submitForm` helper; calculation requires only `requireSession`, calls `calculate`, and returns `{ action, ok: true }`.

- [ ] **Step 3: Load the management roster once**

Add `backend.tournaments.qualification.getRoster(tournamentId)` to the editor query's existing `Promise.all` and return `qualificationRoster: response.data`. This page already enforces creator/admin access before the request.

- [ ] **Step 4: Add stage type without a component dependency**

In `StagesTab.svelte`, derive whether qualification is available and use a native select for create and update:

```svelte
{@const canSelectQualification =
  dialog.mode === 'update' && dialog.stage.type === 'qualification' ||
  !stages.some((stage) => stage.type === 'qualification')}
<Label for="stage-dialog-type">Type</Label>
<select
  id="stage-dialog-type"
  name="type"
  value={dialog.mode === 'update' ? dialog.stage.type : 'regular'}
  class="h-10 rounded-md border bg-background px-3"
>
  <option value="regular">Regular</option>
  {#if canSelectQualification}
    <option value="qualification">Qualification</option>
  {/if}
</select>
```

Set the selected value from `dialog.stage.type` during update. The backend remains authoritative for concurrent attempts to create or convert a second qualification stage.

- [ ] **Step 5: Hide competitors for qualification lobbies**

Pass the selected stage object from `ScheduleTab` into `ScheduleMatchForm`. Compute:

```ts
$: isQualification = stages.find(({ id }) => id === selectedStageId)?.type === 'qualification';
```

When true, render neither solo nor team competitor/score inputs and change copy from `Match` to `Qualification lobby`. Keep mp URL, dates, staff, sync, and deletion controls unchanged. Backend validation from Task 2 prevents crafted invalid payloads.

- [ ] **Step 6: Build the Participants tab with native forms**

Add `participants` to `editTabs`, page tab headings, data type, and content. `ParticipantsTab.svelte` branches on `qualificationRoster.kind`:

- solo row form posts player ID, seed number input, withdrawal checkbox, and reason input;
- team row form posts team ID, seed, team withdrawal, and reason;
- nested member row posts team ID, user ID, member withdrawal, and reason only;
- top-level calculate form posts to `?/calculateQualificationSeeds` and prevents submission when native confirmation is declined:

```svelte
on:submit={(event) => {
  if (!confirm('Recalculate and overwrite all seeds?')) event.preventDefault();
}}
```

Use existing `Button`, `Input`, and `Label`; use a native checkbox. Disable reason input only when the current row is active, but keep backend clearing as the source of truth. Sort seed ascending with nulls last, then username/team name.

- [ ] **Step 7: Run frontend tests/check and commit**

```bash
pnpm run test:infra
pnpm run check
pnpm run build
git add src/lib/schemas src/lib/server/services/tournaments src/lib/types src/routes/events/'[slug]'/edit
git commit -m "feat: manage qualification participants"
```

Working directory: `apps/frontend`. Expected: all exit 0.

---

### Task 8: Full verification and scope audit

**Files:**
- Verify only; modify the smallest responsible file if a command exposes a defect.

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: one verified end-to-end qualification workflow without additional features.

- [ ] **Step 1: Run the backend suite**

```bash
pnpm --filter backend test -- --runInBand
pnpm --filter backend run build
```

Expected: all Jest suites pass and Nest build exits 0.

- [ ] **Step 2: Run the frontend suite**

```bash
pnpm --filter frontend run test:infra
pnpm --filter frontend run check
pnpm --filter frontend run build
pnpm --filter frontend run api:check
```

Expected: all commands exit 0 and generated API files are clean.

- [ ] **Step 3: Check migration and diff hygiene**

```bash
git diff --check
git status --short
```

Expected: `git diff --check` exits 0 and status contains only intentional files.

- [ ] **Step 4: Manually exercise the shortest happy path**

With local infrastructure running:

1. Create one qualification stage and confirm a second is rejected.
2. Add its mappool and two qualification lobby mp URLs with no competitors.
3. Trigger sync for both and confirm `qualification_attempts` contains both lobbies without duplicates after a second sync.
4. Withdraw one solo player or team, calculate seeds, and confirm only active competitors receive consecutive seeds.
5. Edit one seed manually, recalculate, and confirm the calculated value replaces it.
6. For a team tournament, withdraw a member but not the team and confirm that member's saved attempts still contribute.
