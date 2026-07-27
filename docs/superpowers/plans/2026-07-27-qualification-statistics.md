# Qualification Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public tournament page that compares every qualification competitor's score and place on every qualification map.

**Architecture:** Extend the existing qualification calculation output with presentation metadata and expose it through a read-only tournament endpoint. The SvelteKit page consumes that generated contract and only handles display and sorting; it never recalculates scores or places.

**Tech Stack:** NestJS, Drizzle ORM, Zod 4, Orval, SvelteKit, Svelte, Jest, Bun test.

## Global Constraints

- Route: `/events/[slug]/qualification`.
- Matrix rows are competitors and columns are qualification maps in mappool order.
- A populated cell displays `score · #place`; a missing result displays `—`.
- Initial row order follows calculated qualification seed.
- Clicking a map header sorts by that map's place.
- No browser-side standings calculation.
- No charts, exports, filters, pagination, or editing.

---

### Task 1: Qualification statistics contract

**Files:**
- Modify: `apps/backend/src/modules/qualification/qualification-results.repository.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.spec.ts`
- Modify: `apps/backend/src/modules/qualification/dto/index.ts`
- Modify: `apps/backend/src/modules/qualification/dto/index.spec.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.controller.ts`
- Modify: `apps/backend/src/modules/qualification/qualification.module.ts`

**Interfaces:**
- Consumes: `calculateQualificationSeeds(input)` and `QualificationResultsRepository.load(stageId)`.
- Produces: `GET /api/tournaments/:id/qualification-results`.
- Produces: `QualificationStatisticsDto` with ordered `maps` and `competitors`.

- [ ] **Step 1: Write failing service and DTO tests**

Add a `getStatistics(tournamentId)` service test whose repository returns one qualification stage, two ordered maps, and competitors with one missing result. Assert:

```ts
expect(result).toEqual({
  maps: [
    expect.objectContaining({ osuBeatmapId: 11, mod: 'NM', index: 1 }),
    expect.objectContaining({ osuBeatmapId: 22, mod: 'HD', index: 1 }),
  ],
  competitors: [
    {
      id: 'team-a',
      name: 'Team A',
      seed: 1,
      maps: [
        { osuBeatmapId: 11, gameId: 101, score: 1_900_000, place: 1 },
        { osuBeatmapId: 22, gameId: null, score: 0, place: 2 },
      ],
    },
  ],
});
```

Add a DTO parse test for the same shape.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter backend test -- qualification-results.service.spec.ts modules/qualification/dto/index.spec.ts --runInBand
```

Expected: FAIL because `getStatistics` and `QualificationStatisticsDto` do not exist.

- [ ] **Step 3: Extend the existing repository load**

Return map presentation fields from the existing ordered mappool query:

```ts
{
  beatmapId: beatmaps.id,
  osuBeatmapId: beatmaps.osuBeatmapId,
  artist: beatmaps.artist,
  title: beatmaps.title,
  difficultyName: beatmaps.difficultyName,
  mod: mappoolsBeatmaps.mod,
  index: mappoolsBeatmaps.index,
}
```

Return competitor names alongside IDs and user IDs. Add a repository lookup for the tournament's qualification stage ID. Do not add a second score query or calculation.

- [ ] **Step 4: Implement the service and Zod DTO**

Use `calculateQualificationSeeds` through the existing breakdown path. Map its ordered results to:

```ts
{
  maps: Array<{
    osuBeatmapId: number;
    artist: string;
    title: string;
    difficultyName: string;
    mod: string;
    index: number;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    seed: number;
    maps: Array<{
      osuBeatmapId: number;
      gameId: number | null;
      score: number;
      place: number;
    }>;
  }>;
}
```

Validate URLs and datetimes with Zod 4 top-level formats where applicable; do not introduce deprecated `z.string().url()` or `z.string().datetime()`.

- [ ] **Step 5: Expose the endpoint**

Add `QualificationResultsController` in the existing qualification controller file:

```ts
@Controller('tournaments/:id/qualification-results')
export class QualificationResultsController {
  constructor(private readonly service: QualificationResultsService) {}

  @Get()
  @ZodResponse({ status: 200, type: QualificationStatisticsDto })
  find(@Param('id', TournamentIdPipe) tournamentId: TournamentId) {
    return this.service.getStatistics(tournamentId);
  }
}
```

Register it in `QualificationModule`.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- qualification-results.service.spec.ts modules/qualification/dto/index.spec.ts --runInBand
pnpm --filter backend build
```

Expected: all selected tests PASS and build exits 0.

### Task 2: Generated API and matrix behavior

**Files:**
- Modify: `apps/frontend/openapi/backend.json`
- Modify/Create: generated files under `apps/frontend/src/lib/api/generated/model`
- Modify: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`
- Create: `apps/frontend/src/lib/components/qualificationStatistics/qualification-statistics.ts`
- Create: `apps/frontend/src/lib/components/qualificationStatistics/qualification-statistics.test.ts`

**Interfaces:**
- Consumes: generated `QualificationStatisticsDtoOutput`.
- Produces: `sortQualificationCompetitors(competitors, osuBeatmapId)`.

- [ ] **Step 1: Refresh the generated client**

Start the backend locally, pull `/docs-json`, and run:

```bash
BACKEND_OPENAPI_URL=http://127.0.0.1:3011/docs-json pnpm --filter frontend api:refresh
```

Do not hand-edit generated model or endpoint files.

- [ ] **Step 2: Write the failing sorting test**

Create a Bun test proving that:

```ts
sortQualificationCompetitors(competitors, 11).map(({ id }) => id)
```

returns competitors ordered by map place, with missing results last and original seed as the tie-breaker.

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
pnpm --filter frontend exec bun test src/lib/components/qualificationStatistics/qualification-statistics.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 4: Implement the minimal sorter**

Implement a copied-array sort that reads the backend-provided `place` only:

```ts
export const sortQualificationCompetitors = (
  competitors: QualificationStatisticsDtoOutput['competitors'],
  osuBeatmapId: number | null,
) =>
  [...competitors].sort((left, right) => {
    if (osuBeatmapId === null) return left.seed - right.seed;
    const leftPlace = left.maps.find((map) => map.osuBeatmapId === osuBeatmapId)?.place;
    const rightPlace = right.maps.find((map) => map.osuBeatmapId === osuBeatmapId)?.place;
    return (leftPlace ?? Infinity) - (rightPlace ?? Infinity) || left.seed - right.seed;
  });
```

- [ ] **Step 5: Verify GREEN**

Run the Bun test again. Expected: PASS.

### Task 3: Public qualification statistics page

**Files:**
- Create: `apps/frontend/src/routes/events/[slug]/qualification/+page.server.ts`
- Create: `apps/frontend/src/routes/events/[slug]/qualification/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`

**Interfaces:**
- Consumes: `backend.qualificationResults.find(tournamentId)`.
- Consumes: `sortQualificationCompetitors`.
- Produces: public `/events/[slug]/qualification` page.

- [ ] **Step 1: Add the server load**

Fetch the tournament and qualification statistics in parallel. Map backend errors through `throwBackendError` with a 404 fallback.

- [ ] **Step 2: Render the matrix**

Render a semantic table with:

```svelte
<th class="sticky left-0 ...">Team</th>
{#each data.statistics.maps as map}
  <th>
    <button on:click={() => (sortMapId = map.osuBeatmapId)}>
      {map.mod}{map.index} · {map.title}
    </button>
  </th>
{/each}
```

Each cell displays:

```svelte
{result ? `${result.score.toLocaleString()} · #${result.place}` : '—'}
```

Wrap the table in `overflow-x-auto` and keep the first column sticky.

- [ ] **Step 3: Link the page from tournament navigation**

When `data.stages.some(({ type }) => type === 'qualification')`, render a `Qualification` navigation item pointing to `/events/${data.tournament.id}/qualification`.

- [ ] **Step 4: Run frontend verification**

Run:

```bash
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: zero Svelte diagnostics and build exit 0.

### Task 4: End-to-end verification and graph update

**Files:**
- Update generated graph files through the graphify CLI.

- [ ] **Step 1: Run backend qualification tests**

With PostgreSQL available:

```bash
pnpm --filter backend test -- modules/qualification --runInBand
```

Expected: all qualification unit and PostgreSQL integration tests PASS.

- [ ] **Step 2: Verify generated API reproducibility**

Run API generation twice and compare the generated diff. Expected: no change on the second generation.

- [ ] **Step 3: Update graphify**

Run:

```bash
graphify update .
```

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only files listed by this plan.
