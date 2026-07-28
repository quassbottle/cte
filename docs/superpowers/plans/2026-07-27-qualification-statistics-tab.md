# Qualification Statistics Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move qualification statistics into the tournament tabs, add persisted seeds and compact map headers, open existing lobby history dialogs, and make map sorting bidirectional and backend-owned.

**Architecture:** Extend the existing qualification-results read endpoint with validated sort query parameters and return competitors in final display order. The existing tournament page conditionally loads that response and renders a focused statistics tab; URL query parameters drive server reloads, while existing qualification lobby DTOs and `QualificationLobbyDetailDialog` provide match history.

**Tech Stack:** NestJS, Drizzle ORM, Zod 4, Orval, SvelteKit, Svelte 5, Jest.

## Global Constraints

- Qualification statistics are a real tab on `/events/[slug]`; the standalone qualification route is removed.
- The backend is the sole owner of competitor ordering.
- Missing map results display as `—` and sort as score `0`.
- Persisted seed is the default order and map-sort tie-breaker.
- Map headers are compact matrix-specific thumbnails, not the full beatmap component.
- The existing `QualificationLobbyDetailDialog` is reused.
- No new dependency or generic table/modal abstraction.

---

### Task 1: Backend-owned bidirectional sorting

**Files:**
- Modify: `apps/backend/src/modules/qualification/dto/index.ts`
- Modify: `apps/backend/src/modules/qualification/dto/index.spec.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.controller.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.repository.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.spec.ts`

**Interfaces:**
- Produces: `QualificationStatisticsQueryDto` with optional `sortBeatmapId: number` and `sortDirection: 'asc' | 'desc'`.
- Produces: `QualificationResultsService.getStatistics(tournamentId, query)`.
- Extends: map output with `coverUrl: string`.

- [ ] **Step 1: Add failing DTO and service tests**

Add DTO assertions:

```ts
expect(
  qualificationStatisticsQuerySchema.parse({
    sortBeatmapId: '11',
    sortDirection: 'desc',
  }),
).toEqual({ sortBeatmapId: 11, sortDirection: 'desc' });

expect(() =>
  qualificationStatisticsQuerySchema.parse({ sortDirection: 'sideways' }),
).toThrow();
```

Extend the service fixture to include three competitors:

```ts
const competitors = [
  { id: 'a', name: 'A', seed: 2, tieBreakId: 'a', userIds: ['a'] },
  { id: 'b', name: 'B', seed: 1, tieBreakId: 'b', userIds: ['b'] },
  { id: 'missing', name: 'Missing', seed: 3, tieBreakId: 'missing', userIds: ['missing'] },
];
```

Provide map `11` scores giving A score 200, B score 100, and Missing a null game
with score 0. Assert:

```ts
expect(
  (await service.getStatistics(tournamentId, {
    sortBeatmapId: 11,
    sortDirection: 'asc',
  })).competitors.map(({ id }) => id),
).toEqual(['missing', 'b', 'a']);

expect(
  (await service.getStatistics(tournamentId, {
    sortBeatmapId: 11,
    sortDirection: 'desc',
  })).competitors.map(({ id }) => id),
).toEqual(['a', 'b', 'missing']);
```

Also assert no sort returns `['b', 'a', 'missing']` by persisted seed.

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter backend test -- qualification-results.service.spec.ts modules/qualification/dto/index.spec.ts --runInBand
```

Expected: FAIL because the query schema and service query argument do not exist.

- [ ] **Step 3: Add the Zod query contract**

Add:

```ts
export const qualificationStatisticsQuerySchema = z.object({
  sortBeatmapId: z.coerce.number().int().positive().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

export class QualificationStatisticsQueryDto extends createZodDto(
  qualificationStatisticsQuerySchema,
) {}
```

Add `coverUrl: z.url()` to each map in `qualificationStatisticsDtoSchema`.

- [ ] **Step 4: Supply compact cover metadata**

Select `beatmaps.osuBeatmapsetId` in the existing ordered map query. Map it in
`getStatistics()` without another database query:

```ts
coverUrl: `https://assets.ppy.sh/beatmaps/${osuBeatmapsetId}/covers/cover@2x.jpg`,
```

- [ ] **Step 5: Sort the service response**

Accept:

```ts
public async getStatistics(
  tournamentId: TournamentId,
  query: { sortBeatmapId?: number; sortDirection: 'asc' | 'desc' },
)
```

Build the current competitor output once, then sort:

```ts
const resultFor = (competitor: CompetitorOutput) =>
  competitor.maps.find(({ osuBeatmapId }) => osuBeatmapId === query.sortBeatmapId);

competitors.sort((left, right) => {
  if (query.sortBeatmapId === undefined) return left.seed - right.seed;
  const leftResult = resultFor(left);
  const rightResult = resultFor(right);
  return (
    ((leftResult?.score ?? 0) - (rightResult?.score ?? 0)) *
      (query.sortDirection === 'desc' ? -1 : 1) ||
    left.seed - right.seed
  );
});
```

Keep this directly in the existing service; do not create a sorting class.

- [ ] **Step 6: Pass validated query parameters from the controller**

Use Nest `@Query()`:

```ts
public find(
  @Param('id', TournamentIdPipe) tournamentId: TournamentId,
  @Query() query: QualificationStatisticsQueryDto,
) {
  return this.service.getStatistics(tournamentId, query);
}
```

- [ ] **Step 7: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- qualification-results.service.spec.ts modules/qualification/dto/index.spec.ts --runInBand
pnpm --filter backend build
```

Expected: selected tests and build PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/qualification
git commit -m "feat(qualification): sort statistics on backend"
```

### Task 2: Regenerate the typed API client

**Files:**
- Modify: `apps/frontend/openapi/backend.json`
- Modify/Create: generated files under `apps/frontend/src/lib/api/generated/model`
- Modify: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`

**Interfaces:**
- Consumes: backend OpenAPI from Task 1.
- Produces: generated query parameter type for qualification statistics.
- Produces: `backend.qualificationResults.find(tournamentId, params)`.

- [ ] **Step 1: Start the current backend and refresh the client**

Start the backend on an available local port, fetch `/docs-json`, then run:

```bash
BACKEND_OPENAPI_URL=http://127.0.0.1:3011/docs-json pnpm --filter frontend api:refresh
```

Do not hand-edit generated files.

- [ ] **Step 2: Update only the manual backend wrapper**

Import the generated params type and forward it:

```ts
find: (
  tournamentId: string,
  params?: QualificationResultsControllerFindParams,
) => qualificationResultsControllerFind(tournamentId, params, options),
```

- [ ] **Step 3: Verify reproducibility**

Run generation again against the same live backend and confirm:

```bash
git diff --exit-code -- apps/frontend/openapi/backend.json \
  apps/frontend/src/lib/api/generated/model \
  apps/frontend/src/lib/server/backend/generated/endpoints.ts
```

after snapshotting the first generated state. Expected: the second generation
adds no further changes.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/openapi/backend.json \
  apps/frontend/src/lib/api/generated/model \
  apps/frontend/src/lib/server/backend/generated/endpoints.ts \
  apps/frontend/src/lib/server/backend/client.ts
git commit -m "chore(frontend): refresh qualification statistics client"
```

### Task 3: Tournament qualification statistics tab

**Files:**
- Create: `apps/frontend/src/routes/events/[slug]/components/QualificationStatisticsTab.svelte`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Delete: `apps/frontend/src/routes/events/[slug]/qualification/+page.server.ts`
- Delete: `apps/frontend/src/routes/events/[slug]/qualification/+page.svelte`
- Delete: `apps/frontend/src/lib/components/qualificationStatistics/qualification-statistics.ts`
- Delete: `apps/frontend/src/lib/components/qualificationStatistics/qualification-statistics.test.ts`

**Interfaces:**
- Consumes: backend-returned competitor order.
- Consumes: existing `QualificationLobbyDtoOutput[]` and `MappoolBeatmapDto[]`.
- Reuses: `QualificationLobbyDetailDialog`.
- Produces: `Qualification` tab selected by `?tab=qualification`.

- [ ] **Step 1: Pass sort state through the tournament page load**

Extend `getTournamentPage()` arguments with:

```ts
qualificationSort?: {
  sortBeatmapId?: number;
  sortDirection: 'asc' | 'desc';
};
```

After the existing stage request resolves, fetch statistics only when:

```ts
stages.some(({ type }) => type === 'qualification')
```

Return `qualificationStatistics: QualificationStatisticsDtoOutput | null`.

In `+page.server.ts`, parse URL parameters without recalculating standings:

```ts
const sortBeatmapId = Number(event.url.searchParams.get('sortBeatmapId'));
const sortDirection =
  event.url.searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';

const qualificationSort = {
  ...(Number.isSafeInteger(sortBeatmapId) && sortBeatmapId > 0
    ? { sortBeatmapId }
    : {}),
  sortDirection,
};
```

- [ ] **Step 2: Add qualification to the real tab union**

Extend:

```ts
const tournamentTabs = [
  'info',
  'participants',
  'staff',
  'schedule',
  'mappools',
  'qualification',
] as const;
```

Render the head item only for a qualification stage:

```svelte
{#if data.qualificationStatistics}
  <Item value="qualification" href={getTournamentTabHref('qualification')}>
    Qualification
  </Item>
{/if}
```

- [ ] **Step 3: Build the compact statistics tab**

Create `QualificationStatisticsTab.svelte` with props for statistics, lobbies,
beatmaps, tournament ID, team mode, and current sort state.

Wrap the matrix:

```svelte
<div class="w-full overflow-x-auto rounded-md border border-border">
  <table class="min-w-max border-collapse text-sm">
```

Keep the first column sticky and display:

```svelte
#{competitor.seed} · {competitor.name}
```

Resolve the existing lobby:

```ts
const lobbyFor = (competitorId: string) =>
  lobbies.find((lobby) =>
    (isTeam ? lobby.teams : lobby.players).some(({ id }) => id === competitorId),
  );
```

Place a compact icon-only button beside the name. It sets
`selectedLobbyId`; render the existing dialog:

```svelte
{#if selectedLobby}
  <QualificationLobbyDetailDialog
    lobby={selectedLobby}
    {beatmaps}
    onClose={() => (selectedLobbyId = null)}
  />
{/if}
```

Use the existing external/open icon with an accessible label such as
`Open {competitor.name} qualification history`.

- [ ] **Step 4: Render compact map thumbnails**

Do not import the full beatmap component. Each `<th>` contains a bounded link:

```svelte
<a
  class="relative block h-20 w-48 overflow-hidden rounded text-left"
  href={sortHref(map.osuBeatmapId)}
>
  <img class="absolute inset-0 h-full w-full object-cover" src={map.coverUrl} alt="" />
  <span class="absolute inset-0 bg-black/60"></span>
  <span class="relative flex h-full flex-col justify-end p-2 text-white">
    <strong>{map.mod}{map.index}</strong>
    <span class="truncate">{map.title}</span>
    <span class="truncate text-xs opacity-80">{map.difficultyName}</span>
  </span>
</a>
```

`sortHref()` preserves `tab=qualification`, toggles the active map between
`desc` and `asc`, and resets a newly selected map to `desc`. The arrow and
`aria-sort` reflect the server-provided query state.

- [ ] **Step 5: Remove frontend sorting and standalone route**

Delete the copied-array sorter, its test, and both standalone route files.
The tab must render `statistics.competitors` without calling `.sort()`.

- [ ] **Step 6: Verify frontend**

Run:

```bash
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: zero Svelte diagnostics and production build exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts \
  'apps/frontend/src/routes/events/[slug]' \
  apps/frontend/src/lib/components/qualificationStatistics
git commit -m "feat(qualification): move statistics into tournament tab"
```

### Task 4: Full regression verification

**Files:**
- Update generated graph files through `graphify update .`.

**Interfaces:**
- Verifies the complete backend-to-tab flow.

- [ ] **Step 1: Run qualification tests with PostgreSQL**

```bash
pnpm --filter backend test -- modules/qualification --runInBand
```

Expected: all qualification suites PASS, including PostgreSQL integration.

- [ ] **Step 2: Run frontend checks**

```bash
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: check and build PASS.

- [ ] **Step 3: Update graphify and inspect the diff**

```bash
graphify update .
git diff --check
git status --short
```

Expected: graph update succeeds, no whitespace errors, and only planned files
are changed.

- [ ] **Step 4: Commit graph changes if tracked**

```bash
git add graphify-out
git commit -m "chore(graphify): update qualification statistics graph"
```

Skip this commit when graphify outputs are ignored or unchanged.
