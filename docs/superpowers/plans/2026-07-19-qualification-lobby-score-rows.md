# Qualification Lobby Score Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render qualification attempts as reusable player score rows beneath the existing `Beatmap` card, including synchronized mods, combo, accuracy, score, hit counts, rank, and avatar.

**Architecture:** Extend the existing osu! match snapshot and multiplayer-score row rather than adding another fetch path. Add a domain-neutral `BeatmapScore` presentation component, then pass the tournament page's already-loaded mappool beatmaps through the schedule modal and adapt qualification attempts into `BeatmapScore` props.

**Tech Stack:** NestJS, Zod, Drizzle/PostgreSQL, Jest, Svelte 5, Tailwind CSS, Bun/Svelte Check.

## Global Constraints

- Reuse `apps/frontend/src/lib/components/beatmap/beatmap.svelte`; do not duplicate its UI.
- Generate migration SQL, journal, and snapshots only with Drizzle Kit CLI; never edit journal or snapshots manually.
- Keep new persisted score-detail fields nullable so existing synchronized scores remain readable.
- Do not fetch score or beatmap data when the dialog opens.
- Preserve the score under its beatmap and render one dedicated component per player attempt.

---

### Task 1: Parse complete osu! player scores

**Files:**
- Modify: `apps/backend/src/lib/infrastructure/osu/osu.service.spec.ts`
- Modify: `apps/backend/src/lib/infrastructure/osu/osu.service.ts`
- Modify: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.types.ts`

**Interfaces:**
- Produces: `OsuMatchScore` fields `mods: string[]`, `maxCombo: number`, `accuracy: number`, `rank: string`, `great: number`, `ok: number`, and `miss: number` in addition to existing fields.

- [ ] **Step 1: Extend the existing osu service test with a complete score**

Add `mods: ['HD', 'HR']`, `max_combo: 1457`, `accuracy: 0.9872`, `rank: 'A'`, and `statistics: { count_300: 1463, count_100: 16, count_miss: 11 }` to the first mocked score. Assert that the resolved snapshot contains:

```ts
{
  userId: 16536516,
  score: 966909,
  mods: ['HD', 'HR'],
  maxCombo: 1457,
  accuracy: 0.9872,
  rank: 'A',
  great: 1463,
  ok: 16,
  miss: 11,
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter backend test -- --runInBand lib/infrastructure/osu/osu.service.spec.ts`

Expected: FAIL because the snapshot currently strips the added fields.

- [ ] **Step 3: Extend parsing and the snapshot type minimally**

Add the seven fields to `OsuMatchScore`. Extend `osuMatchDetailsSchema` with:

```ts
mods: z.array(z.string()),
max_combo: z.number().int().nonnegative(),
accuracy: z.number().min(0).max(1),
rank: z.string(),
statistics: z.object({
  count_300: z.number().int().nonnegative(),
  count_100: z.number().int().nonnegative(),
  count_miss: z.number().int().nonnegative(),
}),
```

Map those fields to the camel-case `OsuMatchScore` interface, using `count_300` as `great` and `count_100` as `ok`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm --filter backend test -- --runInBand lib/infrastructure/osu/osu.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/infrastructure/osu/osu.service.ts apps/backend/src/lib/infrastructure/osu/osu.service.spec.ts apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.types.ts
git commit -m "feat(sync): parse qualification score details"
```

### Task 2: Persist synchronized score details

**Files:**
- Modify: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.spec.ts`
- Modify: `apps/backend/src/modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/osu-multiplayer/scores.ts`
- Generate: `apps/backend/drizzle/*`

**Interfaces:**
- Consumes: the extended `OsuMatchScore` from Task 1.
- Produces: nullable database columns `mods`, `maxCombo`, `accuracy`, `rank`, `great`, `ok`, and `miss` on `osuMultiplayerScores`.

- [ ] **Step 1: Make the repository fixture and assertion describe persistence**

Add the complete fields from Task 1 to one score in `snapshot`. Extend the `osuMultiplayerScores` write assertion with:

```ts
expect.objectContaining({
  osuUserId: 888_001,
  mods: ['HD', 'HR'],
  maxCombo: 1457,
  accuracy: 0.9872,
  rank: 'A',
  great: 1463,
  ok: 16,
  miss: 11,
})
```

- [ ] **Step 2: Run the repository test and verify RED**

Run: `pnpm --filter backend test -- --runInBand modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.spec.ts`

Expected: FAIL because `applySnapshot` does not persist the fields.

- [ ] **Step 3: Add nullable columns to the Drizzle schema**

Use `text('mods').array()`, `integer` for combo/hit counts, `doublePrecision` for accuracy, and `text` for rank. Do not add defaults; null distinguishes legacy data from real zero values.

- [ ] **Step 4: Generate the migration only through Drizzle Kit**

Run: `pnpm --filter backend migration:generate -- --name=qualification-score-details`

Expected: a new generated migration SQL file plus CLI-generated journal and snapshot changes. Inspect SQL to confirm it only adds the seven nullable columns; do not hand-edit metadata files.

- [ ] **Step 5: Persist fields on insert and conflict update**

Copy the seven fields into `scoreValues` and into the `onConflictDoUpdate().set` object using the existing `excluded` pattern.

- [ ] **Step 6: Run the repository test and verify GREEN**

Run: `pnpm --filter backend test -- --runInBand modules/osu-multiplayer-sync/osu-multiplayer-sync.repository.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/lib/infrastructure/db/osu-multiplayer/scores.ts apps/backend/src/modules/osu-multiplayer-sync apps/backend/drizzle
git commit -m "feat(sync): persist qualification score details"
```

### Task 3: Expose score details in the lobby API

**Files:**
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.service.spec.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.service.ts`
- Modify: `apps/backend/src/modules/qualification/dto/index.ts`
- Generate: `apps/frontend/openapi/backend.json`
- Generate: `apps/frontend/src/lib/api/generated/model/qualificationLobbyDtoOutputAttemptsItem.ts`
- Generate: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`

**Interfaces:**
- Produces: nullable attempt DTO properties `mods: string[] | null`, `maxCombo: number | null`, `accuracy: number | null`, `rank: string | null`, `great: number | null`, `ok: number | null`, `miss: number | null`.

- [ ] **Step 1: Add a failing service expectation**

Extend the existing `findByTournament` score fixture and expectation so the returned attempt includes all seven nullable detail fields from its `osuMultiplayerScores` row.

- [ ] **Step 2: Run the service test and verify RED**

Run: `pnpm --filter backend test -- --runInBand modules/qualification/qualification-lobby.service.spec.ts`

Expected: FAIL because the select projection omits score details.

- [ ] **Step 3: Extend the select projection and response schema**

Select the seven new columns in `QualificationLobbyService.findByTournament`. Add matching nullable Zod fields to each object in `qualificationLobbyDtoSchema.attempts`; keep existing fields unchanged.

- [ ] **Step 4: Run the service test and backend build**

Run: `pnpm --filter backend test -- --runInBand modules/qualification/qualification-lobby.service.spec.ts && pnpm --filter backend build`

Expected: PASS and exit 0.

- [ ] **Step 5: Regenerate the frontend API client**

Run the backend locally as documented in `apps/frontend/README.md`, then run `pnpm --filter frontend api:refresh`.

Expected: generated attempt types contain all seven nullable fields. Do not manually edit generated files.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/qualification apps/frontend/openapi/backend.json apps/frontend/src/lib/api/generated/model apps/frontend/src/lib/server/backend/generated
git commit -m "feat(qualification): expose player score details"
```

### Task 4: Build the reusable beatmap score row

**Files:**
- Create: `apps/frontend/src/lib/components/beatmapScore/beatmapScore.svelte`
- Create: `apps/frontend/src/lib/components/beatmapScore/beatmapScore.ts`
- Create: `apps/frontend/src/lib/components/beatmapScore/beatmapScore.test.ts`

**Interfaces:**
- Produces: generic `BeatmapScoreData`, `formatBeatmapScore(score: number): string`, `formatBeatmapAccuracy(accuracy: number | null): string | null`, and the `BeatmapScore` component. These files do not import qualification DTOs.

- [ ] **Step 1: Write failing formatter tests**

```ts
import { describe, expect, it } from 'bun:test';
import { formatBeatmapAccuracy, formatBeatmapScore } from './beatmapScore';

describe('qualification score row formatting', () => {
  it('formats score and accuracy for display', () => {
    expect(formatBeatmapScore(961684)).toBe('961,684');
    expect(formatBeatmapAccuracy(0.9872)).toBe('98.72%');
    expect(formatBeatmapAccuracy(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the formatter test and verify RED**

Run: `pnpm --filter frontend exec bun test src/lib/components/beatmapScore/beatmapScore.test.ts`

Expected: FAIL because the formatter module does not exist.

- [ ] **Step 3: Implement the two formatter functions**

Use `Intl.NumberFormat` for score and `Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })` for accuracy. Return null when accuracy is null.

- [ ] **Step 4: Run the formatter test and verify GREEN**

Run: `pnpm --filter frontend exec bun test src/lib/components/beatmapScore/beatmapScore.test.ts`

Expected: PASS.

- [ ] **Step 5: Create the presentation-only score row**

Define this qualification-independent input and accept it as a `score` prop:

```ts
export type BeatmapScoreData = {
  osuUserId: number;
  userName: string | null;
  mods: string[] | null;
  maxCombo: number | null;
  accuracy: number | null;
  score: number;
  great: number | null;
  ok: number | null;
  miss: number | null;
  rank: string | null;
};
```

Render:

- `<img src={`https://a.ppy.sh/${score.osuUserId}`} alt={`${displayName} avatar`}>`;
- `score.userName ?? `osu! ${score.osuUserId}``;
- one existing `Mod` component per `score.mods ?? []`;
- combo, formatted accuracy, prominent formatted score, great/ok/miss, and rank only when their nullable values are available.

Use a single responsive flex/grid container with wrapping; add no new dependency and no data fetching.

- [ ] **Step 6: Run frontend check**

Run: `pnpm --filter frontend check`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/components/beatmapScore
git commit -m "feat(frontend): add reusable beatmap score row"
```

### Task 5: Compose Beatmap and player score rows in lobby details

**Files:**
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/QualificationLobbiesTab.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyTable.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby.svelte`

**Interfaces:**
- Consumes: page `mappoolBeatmaps`, existing `Beatmap`, and generic `BeatmapScore`.
- Produces: lobby detail groups rendered as one beatmap card followed by player rows.

- [ ] **Step 1: Pass mappool beatmaps through the existing component chain**

Add a `MappoolBeatmapDto[]` prop named `beatmaps` to the schedule, qualification tab, table, dialog, and lobby card. At `+page.svelte`, flatten the already-loaded data once:

```svelte
beatmaps={data.mappoolBeatmaps.flatMap(({ beatmaps }) => beatmaps)}
```

Forward the same prop without copying or fetching.

- [ ] **Step 2: Replace the textual attempt group with component composition**

In `qualificationLobby.svelte`, import `Beatmap` and `BeatmapScore`, resolve the group map with `beatmaps.find(({ osuBeatmapId }) => osuBeatmapId === Number(beatmapId))`, and when present render:

```svelte
<Beatmap
  artist={beatmap.artist}
  title={beatmap.title}
  difficultyName={beatmap.difficultyName}
  beatmapsetId={beatmap.osuBeatmapsetId}
  beatmapId={beatmap.osuBeatmapId}
  mod={beatmap.mod}
  tournamentMode={beatmap.mode}
  index={beatmap.index}
  difficulty={beatmap.difficulty}
  deleted={beatmap.deleted}
/>
<div class="space-y-2">
  {#each attempts as attempt (`${attempt.gameId}-${attempt.osuUserId}`)}
    <BeatmapScore score={attempt} />
  {/each}
</div>
```

If a synchronized beatmap is absent from the visible mappool, retain the linked fallback heading `Beatmap {beatmapId}` so its scores are never hidden.

- [ ] **Step 3: Run frontend tests and check**

Run: `pnpm --filter frontend exec bun test src/lib/components/beatmapScore src/lib/components/qualificationLobby && pnpm --filter frontend check`

Expected: all tests PASS and check exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/routes/events/'[slug]' apps/frontend/src/lib/components/qualificationLobby
git commit -m "feat(qualification): show beatmaps with player scores"
```

### Task 6: Full verification and graph refresh

**Files:**
- Update: `graphify-out/*`

- [ ] **Step 1: Run backend verification**

Run: `pnpm --filter backend test -- --runInBand && pnpm --filter backend build`

Expected: all Jest suites PASS and build exits 0.

- [ ] **Step 2: Run frontend verification**

Run: `pnpm --filter frontend test:infra && pnpm --filter frontend check && pnpm --filter frontend build`

Expected: tests PASS; check and build exit 0.

- [ ] **Step 3: Verify generated artifacts and whitespace**

Run: `pnpm --filter frontend api:check && git diff --check`

Expected: API generation has no diff and whitespace check exits 0.

- [ ] **Step 4: Refresh the required knowledge graph**

Run: `graphify update .`

Expected: graph update exits 0 and records the changed AST relationships.

- [ ] **Step 5: Review final scope**

Run: `git status --short && git diff HEAD~5 --stat`

Expected: only score synchronization, generated migration/API files, qualification score UI, tests, and graph artifacts are changed.
