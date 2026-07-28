# Regular Match History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open synchronized regular-stage match history from Schedule using the same dialog and score components as qualification lobbies, highlighting the winning side.

**Architecture:** Add a tournament-scoped, on-demand regular match history endpoint backed by existing multiplayer tables and `MatchResultService`. Extract the current qualification dialog/history markup into shared multiplayer history components; both qualification lobbies and regular matches adapt their existing data to that shared view model.

**Tech Stack:** NestJS, Drizzle ORM, Zod/nestjs-zod, Svelte 5, SvelteKit, Orval, Jest, Bun test.

## Global Constraints

- Use an explicit `Open` button on desktop and mobile.
- Keep MP and VOD links independent.
- Reuse one dialog, one history renderer, `MultiplayerScore`, and `PlayerMultiplayerScore`.
- Do not fabricate a qualification lobby DTO for regular matches.
- Load regular match history only when the dialog opens.
- Use the existing calculated match result to select the winning side.
- Tied, unfinished, unavailable, and empty histories must not highlight a winner.
- Add no dependency and no new database migration.

---

### Task 1: Regular match history API

**Files:**
- Modify: `apps/backend/src/modules/match/dto/index.ts`
- Create: `apps/backend/src/modules/match/match-history.service.ts`
- Create: `apps/backend/src/modules/match/match-history.service.spec.ts`
- Modify: `apps/backend/src/modules/match/match.module.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`

**Interfaces:**
- Consumes: `MatchResultService.get(matchId: MatchId): Promise<MatchResult>` and existing multiplayer room/game/score, user, match, mappool, and beatmap tables.
- Produces: `MatchHistoryDto`, `MatchHistoryDtoOutput`, and `MatchHistoryService.get(tournamentId, matchId)`.
- Endpoint: `GET /api/tournaments/:id/matches/:matchId/history`.

- [ ] **Step 1: Define a failing service test**

Create `match-history.service.spec.ts` with a minimal fake Drizzle query sequence. Assert that:

```ts
expect(await service.get(tournamentId, matchId)).toEqual({
  title: 'Final 1',
  mpUrl: 'https://osu.ppy.sh/community/matches/123',
  syncStatus: 'completed',
  lastSyncedAt: '2026-07-28T10:00:00.000Z',
  winner: 'red',
  games: [
    {
      gameId: 10,
      beatmapId: 20,
      scores: [
        expect.objectContaining({
          osuUserId: 30,
          userName: 'Player',
          team: 'red',
          score: 999_000,
          mods: ['NF'],
          highlighted: true
        })
      ]
    }
  ]
});
```

Add separate assertions that equal match points return `winner: null` and
`highlighted: false`, and that games are ordered by `endedAt`, then game ID.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter backend test -- match-history.service.spec.ts --runInBand
```

Expected: FAIL because `MatchHistoryService` does not exist.

- [ ] **Step 3: Add the response schema**

In `dto/index.ts`, reuse one score schema for the history response:

```ts
const matchHistoryScoreDtoSchema = z.object({
  osuUserId: z.number().int(),
  userName: z.string().nullable(),
  team: z.enum(['red', 'blue']).nullable(),
  score: z.number().int(),
  mods: z.array(z.string()),
  maxCombo: z.number().int(),
  accuracy: z.number(),
  rank: z.string(),
  great: z.number().int().nullable(),
  ok: z.number().int().nullable(),
  miss: z.number().int().nullable(),
  highlighted: z.boolean()
});

export const matchHistoryDtoSchema = z.object({
  title: z.string(),
  mpUrl: z.url().nullable(),
  syncStatus: z.enum(['active', 'stopped', 'completed']).nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  winner: z.enum(['red', 'blue']).nullable(),
  games: z.array(z.object({
    gameId: z.number().int(),
    beatmapId: z.number().int(),
    scores: z.array(matchHistoryScoreDtoSchema)
  }))
});

export type MatchHistoryDtoOutput = z.output<typeof matchHistoryDtoSchema>;
export class MatchHistoryDto extends createZodDto(matchHistoryDtoSchema) {}
```

- [ ] **Step 4: Implement the minimal history service**

Create `MatchHistoryService` that:

1. Selects the scoped match and joined multiplayer room by both tournament ID
   and match ID.
2. Throws the existing `MATCH_NOT_FOUND` exception if it is not scoped to the
   tournament.
3. Loads room games and detailed scores with user names, ordered by
   `osuMultiplayerGames.endedAt` and `osuGameId`.
4. Calls `MatchResultService.get(matchId)` once.
5. Derives the winner only when both calculated scores are non-null and unequal:

```ts
const winner =
  result.redScore === null ||
  result.blueScore === null ||
  result.redScore === result.blueScore
    ? null
    : result.redScore > result.blueScore
      ? 'red'
      : 'blue';
```

6. Maps `highlighted: winner !== null && score.team === winner`.

Do not duplicate match point calculation and do not add persistence.

- [ ] **Step 5: Register and expose the endpoint**

Add `MatchHistoryService` to `MatchModule.providers` and `exports`. Inject it
into `TournamentController` and add:

```ts
@Get(':id/matches/:matchId/history')
@ZodResponse({
  status: 200,
  description: 'Returns synchronized multiplayer history for a match.',
  type: MatchHistoryDto
})
public getMatchHistory(
  @Param('id', TournamentIdPipe) id: TournamentId,
  @Param('matchId', MatchIdPipe) matchId: MatchId
): Promise<MatchHistoryDtoOutput> {
  return this.matchHistoryService.get(id, matchId);
}
```

- [ ] **Step 6: Run backend verification**

Run:

```bash
pnpm --filter backend test -- match-history.service.spec.ts match-result.service.spec.ts --runInBand
```

Expected: both suites PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/match apps/backend/src/modules/tournament/tournament.controller.ts
git commit -m "feat(match): expose multiplayer history"
```

---

### Task 2: Shared multiplayer history components

**Files:**
- Create: `apps/frontend/src/lib/components/multiplayerHistory/multiplayerHistory.ts`
- Create: `apps/frontend/src/lib/components/multiplayerHistory/multiplayerHistory.test.ts`
- Create: `apps/frontend/src/lib/components/multiplayerHistory/MultiplayerHistory.svelte`
- Create: `apps/frontend/src/lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte`

**Interfaces:**
- Produces `MultiplayerHistoryData` and `toQualificationHistory(lobby, beatmaps)`.
- `MultiplayerHistory` consumes `{ history: MultiplayerHistoryData }`.
- `MultiplayerHistoryDialog` consumes `{ title, history, loading?, error?, onClose, children? }`.
- Qualification and regular schedule dialogs render these exact shared components.

- [ ] **Step 1: Write the failing qualification adapter test**

Move the existing attempt grouping into `multiplayerHistory.ts` and test:

```ts
const history = toQualificationHistory(lobby, beatmaps);

expect(history.games.map(({ beatmap }) => beatmap.beatmapId)).toEqual([11, 22]);
expect(history.games[0].scores[0]).toMatchObject({
  osuUserId: 1,
  highlighted: true
});
expect(history.games[0].standings).toEqual([{ score: 1_900_000, place: 2 }]);
```

The adapter must preserve first game occurrence order, use `attempt.counted`
as `highlighted`, and retain the existing missing-beatmap fallback data.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter frontend test:infra -- multiplayerHistory.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the shared view model and adapter**

Define:

```ts
export type MultiplayerHistoryData = {
  mpUrl: string | null;
  syncStatus: 'active' | 'stopped' | 'completed' | null;
  lastSyncedAt: string | null;
  games: Array<{
    gameId: number;
    beatmap: MultiplayerScoreData['beatmap'] | null;
    beatmapId: number;
    scores: Array<PlayerMultiplayerScoreData & { highlighted: boolean }>;
    standings?: MultiplayerScoreData['standings'];
  }>;
};
```

Make the single score-row renderer consume `highlighted` rather than the
qualification-specific name `counted`; the qualification adapter maps
`counted` to `highlighted`.

- [ ] **Step 4: Extract the shared history renderer and dialog**

`MultiplayerHistory.svelte` loops over `history.games`, renders
`MultiplayerScore` when beatmap metadata exists, and preserves the current
beatmap-ID fallback otherwise.

`MultiplayerHistoryDialog.svelte` owns the existing overlay, Escape/backdrop
close behavior, close button, loading state, error message, and empty-history
message. It accepts header content through a snippet/slot so qualification
metadata remains qualification-owned.

- [ ] **Step 5: Replace qualification-only rendering with shared components**

Keep lobby title, time, referee, seats, competitors, MP link, and sync metadata
in `qualificationLobby.svelte`. Replace only its grouped game/score markup with
`MultiplayerHistory`.

Make `QualificationLobbyDetailDialog.svelte` render
`MultiplayerHistoryDialog` instead of owning another overlay. There must be one
overlay implementation and one game-history loop after this step.

- [ ] **Step 6: Run frontend verification**

Run:

```bash
pnpm --filter frontend test:infra -- multiplayerHistory.test.ts qualificationLobby-view.test.ts
pnpm --filter frontend check
```

Expected: tests PASS and Svelte check reports 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/components/multiplayerHistory apps/frontend/src/lib/components/qualificationLobby apps/frontend/src/lib/components/multiplayerScore
git commit -m "refactor(frontend): share multiplayer history dialog"
```

---

### Task 3: Open regular match history from Schedule

**Files:**
- Create: `apps/frontend/src/routes/api/tournaments/[id]/matches/[matchId]/history/+server.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Regenerate: `apps/frontend/openapi/backend.json`
- Regenerate: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`
- Regenerate: `apps/frontend/src/lib/api/generated/model/*matchHistory*`
- Modify: `apps/frontend/src/lib/components/schedule/schedule.svelte`
- Modify: `apps/frontend/src/lib/components/schedule/ScheduleTable.svelte` if a fixed action column width is required
- Create: `apps/frontend/src/lib/components/schedule/match-history.ts`
- Create: `apps/frontend/src/lib/components/schedule/match-history.test.ts`

**Interfaces:**
- Consumes generated `MatchHistoryDtoOutput`.
- Produces `toMultiplayerHistory(dto, beatmaps): MultiplayerHistoryData`.
- The Schedule component receives existing `matches` plus tournament beatmaps
  and opens `MultiplayerHistoryDialog` for one selected match ID.

- [ ] **Step 1: Refresh the generated client**

With backend running, run:

```bash
pnpm --filter frontend api:refresh
```

Expected: Orval generates `tournamentControllerGetMatchHistory` and
`MatchHistoryDtoOutput`; no generated file is edited manually.

- [ ] **Step 2: Write the failing regular history adapter test**

Create `match-history.test.ts`:

```ts
const history = toMultiplayerHistory(dto, beatmaps);

expect(history.games[0].scores[0]).toMatchObject({
  osuUserId: 30,
  highlighted: true
});
expect(history.games[0].beatmap?.beatmapId).toBe(20);
expect(history.games[1].beatmap).toBeNull();
```

Also assert API game order is unchanged.

- [ ] **Step 3: Run the adapter test and verify it fails**

Run:

```bash
pnpm --filter frontend test:infra -- match-history.test.ts
```

Expected: FAIL because `toMultiplayerHistory` does not exist.

- [ ] **Step 4: Add the backend client and SvelteKit proxy**

Add to `createBackendClient().matches`:

```ts
history: (tournamentId: string, matchId: string) =>
  tournamentControllerGetMatchHistory(tournamentId, matchId, options)
```

The proxy route validates non-empty IDs, calls that method, parses the generated
response shape, and returns `json(response.data)`. Use `throwBackendError` for
backend failures, matching the existing beatmap proxy route.

- [ ] **Step 5: Add the regular history adapter**

Implement `toMultiplayerHistory` by matching each API `beatmapId` against the
already loaded tournament beatmaps and mapping `highlighted` directly to the
shared score-row property. Do not sort games on the frontend.

- [ ] **Step 6: Add the explicit Open controls**

In `schedule.svelte`:

- keep `selectedMatchId`, `history`, `loading`, and `error`;
- show a desktop `Actions` header and `Open` button;
- show the same `Open` button under each mobile `MatchCard`;
- disable the button when `match.lastSyncedAt === null`;
- on click, fetch
  `/api/tournaments/${tournamentId}/matches/${match.id}/history`;
- open `MultiplayerHistoryDialog` immediately with its loading state;
- abort or ignore stale requests when another match is selected or the dialog
  closes;
- pass the selected match name as the dialog title.

Thread `tournamentId` and the already loaded `beatmaps` from
`ScheduleTab.svelte` into `Schedule`; do not load beatmaps again.

- [ ] **Step 7: Run frontend verification**

Run:

```bash
pnpm --filter frontend test:infra -- match-history.test.ts multiplayerHistory.test.ts
pnpm --filter frontend check
pnpm --filter frontend api:check
```

Expected: tests PASS, Svelte check reports 0 errors, and generated API diff is
clean.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/openapi/backend.json apps/frontend/src
git commit -m "feat(schedule): open regular match history"
```

---

### Task 4: Integrated regression verification

**Files:**
- No planned source changes.

**Interfaces:**
- Verifies the backend endpoint, generated contract, qualification reuse, and
  regular Schedule interaction as one feature.

- [ ] **Step 1: Run focused automated checks**

```bash
pnpm --filter backend test -- match-history.service.spec.ts match-result.service.spec.ts --runInBand
pnpm --filter frontend test:infra -- multiplayerHistory.test.ts match-history.test.ts qualificationLobby-view.test.ts
pnpm --filter frontend check
```

Expected: all commands PASS.

- [ ] **Step 2: Run the Docker stack and health check**

```bash
docker compose -f apps/infra/docker-compose.yml up -d --build backend frontend
docker compose -f apps/infra/docker-compose.yml ps
```

Expected: backend and frontend containers report healthy/running.

- [ ] **Step 3: Verify the user flow**

Open a non-qualification stage with a synchronized completed match and verify:

1. `Open` appears on desktop and mobile.
2. The modal opens while MP/VOD still open their own links.
3. Games are in multiplayer order.
4. Beatmap, mods, combo, accuracy, hit statistics, score, and rank render.
5. Every score row on the winning side is highlighted; losing rows are not.
6. A tied/unavailable match has no highlighted rows.
7. Closing and reopening triggers a fresh successful request.
8. A qualification lobby opens through the same dialog with unchanged content.

- [ ] **Step 4: Refresh Graphify and confirm the tree**

```bash
graphify update .
git status --short
```

Expected: no uncommitted source changes remain. If a check fails, return to
the task that owns that behavior, fix it there, rerun its focused checks, and
repeat this regression task.
