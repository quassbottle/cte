# Player Stage Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a team/player switch to stage statistics and return sortable individual attempts for players who participated.

**Architecture:** Extend the existing stage statistics endpoint with a `view` query instead of adding another endpoint. Keep one response and one table; the backend selects team aggregation or player attempts, and all sorting stays in SQL.

**Tech Stack:** NestJS, Drizzle SQL, Zod, SvelteKit, Svelte, Bun tests, Jest.

## Global Constraints

- Team tournaments default to team statistics.
- Solo tournaments always use player statistics and do not render the switch.
- Player statistics include only users with recorded scores.
- Player rows show osu! username and tournament team.
- Every individual attempt is returned and ranked per map.
- No new dependencies or database migration.

---

### Task 1: Extend the stage statistics contract

**Files:**
- Modify: `apps/backend/src/modules/stage/dto/index.ts`
- Create: `apps/backend/src/modules/stage/dto/index.spec.ts`

**Interfaces:**
- Produces: `StageStatisticsQueryDto.view?: 'teams' | 'players'`
- Produces: `StageStatisticsDto.competitors[].teamName?: string`

- [ ] **Step 1: Write failing schema tests**

```ts
import {
  stageStatisticsDtoSchema,
  stageStatisticsQuerySchema,
} from './index';

describe('stage statistics schemas', () => {
  it('parses the player view', () => {
    expect(
      stageStatisticsQuerySchema.parse({
        view: 'players',
        sortDirection: 'desc',
      }),
    ).toEqual({ view: 'players', sortDirection: 'desc' });
  });

  it('accepts a team name on a player row', () => {
    const result = stageStatisticsDtoSchema.parse({
      stageId: 'stage',
      maps: [],
      competitors: [
        {
          id: 'user',
          name: 'Player',
          teamName: 'Japan',
          maps: [],
        },
      ],
    });

    expect(result.competitors[0].teamName).toBe('Japan');
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm --filter backend test -- modules/stage/dto/index.spec.ts --runInBand
```

Expected: FAIL because `view` and `teamName` are stripped or rejected.

- [ ] **Step 3: Extend the Zod schemas**

```ts
export const stageStatisticsQuerySchema = z.object({
  view: z.enum(['teams', 'players']).optional(),
  sortBeatmapId: z.coerce.number().int().positive().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
```

Add `teamName: z.string().optional()` beside competitor `name`.

- [ ] **Step 4: Run the schema tests**

Run:

```bash
pnpm --filter backend test -- modules/stage/dto/index.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/stage/dto
git commit -m "feat(statistics): add player view contract"
```

---

### Task 2: Query and sort individual attempts on the backend

**Files:**
- Modify: `apps/backend/src/modules/stage/stage-statistics.service.ts`
- Create: `apps/backend/src/modules/stage/stage-statistics.service.spec.ts`

**Interfaces:**
- Consumes: `query.view?: 'teams' | 'players'`
- Produces: competitors with `{ id, name, teamName?, maps }`

- [ ] **Step 1: Write failing service tests**

Create a small fake `Schema` whose ordered `execute()` responses contain:

```ts
const playerAttempts = [
  {
    competitorId: 'user-1',
    osuBeatmapId: 11,
    gameId: 101,
    matchId: 'match-1',
    score: 900_000,
    place: 2,
  },
  {
    competitorId: 'user-1',
    osuBeatmapId: 11,
    gameId: 102,
    matchId: 'match-2',
    score: 950_000,
    place: 1,
  },
];
const players = [{ id: 'user-1', name: 'Player', teamName: 'Japan' }];
```

Assert that `get(..., { view: 'players', sortDirection: 'desc' })` returns both attempts, preserves their game and match IDs, and exposes `teamName`.

Add a qualification case where `StageService.getById()` returns `type: 'qualification'`; assert that player view uses raw individual attempts rather than `QualificationResultsService.getStatisticsByStage()`.

- [ ] **Step 2: Run the service tests and verify RED**

Run:

```bash
pnpm --filter backend test -- modules/stage/stage-statistics.service.spec.ts --runInBand
```

Expected: FAIL because qualification always delegates to team statistics and team tournaments always aggregate scores.

- [ ] **Step 3: Add the shared player-attempt SQL**

Load `tournaments.isTeam` before the qualification branch and derive:

```ts
const playerView = !isTeam || query.view === 'players';

if (stage.type === 'qualification' && !playerView)
  return this.qualificationResults.getStatisticsByStage(stageId, query);
```

For player view, use one room CTE for both stage types:

```sql
with stage_rooms as (
  select m.osu_room_id as room_id, m.id as match_id
  from matches m
  where m.stage_id = ${stageId}
  union all
  select q.osu_room_id as room_id, null::text as match_id
  from qualification_lobbies q
  where q.stage_id = ${stageId}
), attempts as (
  select u.id as "competitorId",
         s.osu_beatmap_id as "osuBeatmapId",
         s.osu_game_id as "gameId",
         r.match_id as "matchId",
         s.score::bigint as score
  from stage_rooms r
  join osu_multiplayer_scores s on s.room_id = r.room_id
  join users u on u.osu_id = s.osu_user_id
)
select *, rank() over (
  partition by "osuBeatmapId" order by score desc
)::int as place
from attempts
order by "osuBeatmapId", score desc, "gameId"
```

Keep the existing team query unchanged.

- [ ] **Step 4: Add SQL player discovery and sorting**

Select only users present in the stage-room scores. Left join active tournament membership to expose `teamName`. Default ordering is username; map ordering uses the existing `bestScore` expression with individual `osu_user_id` matching:

```sql
order by ${
  sortBeatmapId === null
    ? sql`competitor.osu_username ${direction}`
    : sql`${bestScore} ${direction}, competitor.osu_username asc`
}
```

For team tournaments join `team_participants` and `teams` with the selected tournament and non-withdrawn rows. Return `teamName` only in player view.

- [ ] **Step 5: Run backend tests and build**

Run:

```bash
pnpm --filter backend test -- modules/stage --runInBand
pnpm --filter backend build
```

Expected: PASS and successful build.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/stage
git commit -m "feat(statistics): query individual stage attempts"
```

---

### Task 3: Carry player view through generated API and page loading

**Files:**
- Modify generated files via scripts: `apps/frontend/openapi/backend.json`, `apps/frontend/src/lib/api/generated/model`, `apps/frontend/src/lib/server/backend/generated`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.server.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.test.ts`

**Interfaces:**
- Consumes: URL `view=players`
- Passes: backend query `{ view?: 'teams' | 'players', sortBeatmapId?, sortDirection }`

- [ ] **Step 1: Extend the failing tournament-page query test**

Call `getTournamentPage()` with:

```ts
{
  stageId: 'stage',
  view: 'players',
  sortBeatmapId: 11,
  sortDirection: 'desc',
}
```

Expect:

```ts
expect(backend.stages.getStatistics).toHaveBeenCalledWith(
  'tournament',
  'stage',
  { view: 'players', sortBeatmapId: 11, sortDirection: 'desc' },
);
```

- [ ] **Step 2: Run frontend infrastructure tests and verify RED**

Run:

```bash
pnpm --filter frontend test:infra
```

Expected: FAIL because the page query does not accept or forward `view`.

- [ ] **Step 3: Refresh the generated API**

Start the backend locally, then run:

```bash
pnpm --filter frontend api:refresh
```

Verify the generated `StageControllerGetStatisticsParams` includes `view` and competitor output includes optional `teamName`.

- [ ] **Step 4: Parse and forward the URL view**

Extend the statistics input type in both server files:

```ts
view?: 'teams' | 'players';
```

Parse only the explicit player value:

```ts
...(event.url.searchParams.get('view') === 'players'
  ? { view: 'players' as const }
  : {}),
```

Forward it to `backend.stages.getStatistics()` only when present.

- [ ] **Step 5: Run frontend infrastructure tests**

Run:

```bash
pnpm --filter frontend test:infra
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/openapi/backend.json apps/frontend/src/lib/api/generated apps/frontend/src/lib/server apps/frontend/src/routes/events/[slug]/+page.server.ts
git commit -m "feat(statistics): load player stage view"
```

---

### Task 4: Add the team/player switch and reuse the table

**Files:**
- Modify: `apps/frontend/src/routes/events/[slug]/components/StatisticsTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/statistics-sort.test.ts`

**Interfaces:**
- Consumes: `isTeam`, URL `view`, and optional `competitor.teamName`
- Produces: links preserving stage, view, and sort state

- [ ] **Step 1: Add failing URL-preservation tests**

Extend `statistics-sort.test.ts`:

```ts
test('preserves the player view while sorting', () => {
  const initial = new URL(
    'https://cte.test/events/twc?tab=statistics&stage=stage&view=players',
  );

  const result = new URL(statisticsSortHref(initial, 11), initial);

  expect(result.searchParams.get('view')).toBe('players');
});
```

This guards the existing `URLSearchParams` behavior while the switch is added.

- [ ] **Step 2: Run the focused test**

Run:

```bash
pnpm --filter frontend exec bun test src/routes/events/[slug]/components/statistics-sort.test.ts
```

Expected: PASS because sorting already preserves unrelated parameters.

- [ ] **Step 3: Render the switch**

Derive:

```ts
$: playerView = isTeam && $page.url.searchParams.get('view') === 'players';
```

For team tournaments render two links using the existing `buttonVariants({ variant: 'stage', size: 'sm' })`. The Teams link deletes `view`; the Players link sets `view=players`. Both links delete `sortBeatmapId` and `sortDirection` so each mode opens in its default username/seed order.

- [ ] **Step 4: Render player identity**

Use the existing competitor cell. When `playerView` is true, show:

```svelte
<span>{competitor.name}</span>
{#if competitor.teamName}
  <span class="text-sm font-normal text-muted-foreground">{competitor.teamName}</span>
{/if}
```

Do not render qualification seeds or qualification-lobby buttons in player view. Keep attempt scores, places, sorting controls, and match-history buttons unchanged.

- [ ] **Step 5: Verify frontend**

Run:

```bash
pnpm --filter frontend test:infra
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: all commands pass with no Svelte diagnostics.

- [ ] **Step 6: Update graph and commit**

```bash
graphify update .
git add apps/frontend/src/routes/events/[slug]/components
git commit -m "feat(statistics): add individual player toggle"
```

---

### Task 5: Final verification

**Files:**
- Verify all modified backend and frontend files.

**Interfaces:**
- Produces: deployable player statistics feature.

- [ ] **Step 1: Run backend verification**

```bash
pnpm --filter backend test -- modules/stage --runInBand
pnpm --filter backend build
```

- [ ] **Step 2: Run frontend verification**

```bash
pnpm --filter frontend test:infra
pnpm --filter frontend check
pnpm --filter frontend build
```

- [ ] **Step 3: Verify generated API and diff**

```bash
pnpm --filter frontend api:check
git diff --check
git status --short
```

Expected: all checks pass and only intentional changes remain.
