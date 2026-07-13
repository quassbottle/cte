# Schedule Status and Competitor Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LIVE/FINISHED/UNKNOWN schedule badges and a debounced backend-search combobox for tournament players and teams while simplifying mappool policy resolution.

**Architecture:** Existing tournament participant and new team-summary queries provide bounded backend search. A SvelteKit proxy normalizes both response shapes for one Bits UI combobox. Match status remains a frontend projection of the existing `syncStatus` field.

**Tech Stack:** NestJS 11, Drizzle ORM, nestjs-zod 5.4, Jest 30, SvelteKit 2, Svelte 5, Bits UI 0.22, Bun tests.

## Global Constraints

- Add no dependencies.
- Search players and teams only inside the selected tournament.
- Debounce browser search by 250 ms and abort stale requests.
- Keep backend match membership validation authoritative.
- Preserve existing staff lookup behavior and form payload names.
- Map `active` to `LIVE`, `stopped | completed` to `FINISHED`, and `null` to `UNKNOWN`.

---

### Task 1: Data-driven mappool policy resolution

**Files:**
- Modify: `apps/backend/src/modules/auth/policies/resolvers/mappool-policy-context.resolver.ts`
- Test: `apps/backend/src/modules/auth/policies/resolvers/mappool-policy-context.resolver.spec.ts`

**Interfaces:**
- Consumes: optional validated `params.tournamentId`, `params.id`, and `body.stageId`.
- Produces: the same `PolicyContext` without checking `request.method` in `resolveTournament`.

- [ ] **Step 1: Extend the failing resolver test**

Mock `resolveTournamentById`, `resolveTournamentByMappoolId`, and `resolveTournamentByStageId` through a test-only view. Verify tournament ID wins when present, mappool ID is second, and stage ID is third even when method values differ.

```ts
await resolver.resolve({ method: 'POST', params: { tournamentId }, body: {} } as PolicyRequest);
expect(resolveTournamentById).toHaveBeenCalledWith(tournamentId);
```

- [ ] **Step 2: Run RED**

Run `pnpm test -- mappool-policy-context.resolver.spec.ts --runInBand` in `apps/backend`. Expected: the non-GET tournament ID case does not call `resolveTournamentById`.

- [ ] **Step 3: Replace the method branch with input precedence**

```ts
const tournamentId = tournamentMappoolParamsSchema.safeParse(request.params).data?.tournamentId;
if (tournamentId) return this.resolveTournamentById(tournamentId);

const mappoolId = mappoolParamsSchema.safeParse(request.params).data?.id;
if (mappoolId) return this.resolveTournamentByMappoolId(mappoolId);

const stageId = createMappoolBodySchema.safeParse(request.body).data?.stageId;
if (stageId) return this.resolveTournamentByStageId(stageId);
```

- [ ] **Step 4: Run GREEN and backend build**

Run the targeted test and `pnpm run build`. Expected: exit 0.

### Task 2: Tournament-scoped backend competitor search

**Files:**
- Modify: `apps/backend/src/modules/tournament/dto/index.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Test: `apps/backend/src/modules/tournament/tournament.service.spec.ts`

**Interfaces:**
- Produces: `FindTournamentParticipantsDto`, `FindTournamentTeamsDto`, `TournamentTeamSummaryDto`.
- Produces: `GET /tournaments/:id/participants?query=&limit=20` and `GET /tournaments/:id/teams/search?query=&limit=20`.

- [ ] **Step 1: Write failing service tests**

Add one test per search method with fake Drizzle builders. Verify returned rows are mapped to users/team summaries and that `limit`/`offset` reach the query chain. Use a numeric player query and a partial team-name query.

```ts
expect(await service.searchTeams({ id, query: 'red', limit: 20, offset: 0 })).toEqual([
  { id: teamId, name: 'Red Dragons' },
]);
```

- [ ] **Step 2: Run RED**

Run `pnpm test -- tournament.service.spec.ts --runInBand`. Expected: `searchTeams` is missing and participant query does not accept search.

- [ ] **Step 3: Add minimal DTOs**

```ts
const competitorSearchSchema = paginationSchema.extend({
  query: z.string().trim().optional(),
});
export class FindTournamentParticipantsDto extends createZodDto(competitorSearchSchema) {}
export class FindTournamentTeamsDto extends createZodDto(competitorSearchSchema) {}

export const tournamentTeamSummaryDtoSchema = z.object({ id: teamIdSchema, name: z.string() });
export class TournamentTeamSummaryDto extends createZodDto(tournamentTeamSummaryDtoSchema) {}
```

- [ ] **Step 4: Implement scoped SQL filters**

For participants, combine tournament membership with optional `ilike(users.osuUsername, `%${query}%`)` and exact `eq(users.osuId, Number(query))` for integer input. For teams, combine `eq(teams.tournamentId, id)` with optional `ilike(teams.name, `%${query}%`)`, then apply `limit` and `offset`.

- [ ] **Step 5: Expose ZodResponse endpoints**

Use `FindTournamentParticipantsDto` on the existing participant route and add:

```ts
@Get(':id/teams/search')
@ZodResponse({ status: 200, description: 'Searches tournament teams.', type: [TournamentTeamSummaryDto] })
searchTeams(@Param('id', TournamentIdPipe) id: TournamentId, @Query() query: FindTournamentTeamsDto) {
  return this.tournamentService.searchTeams({ id, ...query });
}
```

- [ ] **Step 6: Run GREEN, full backend tests, and build**

Run targeted tests, `pnpm test -- --runInBand`, and `pnpm run build`. Expected: all exit 0.

### Task 3: Shared schedule status badge

**Files:**
- Create: `apps/frontend/src/lib/components/match/MatchStatusBadge.svelte`
- Modify: `apps/frontend/src/lib/components/match/types.ts`
- Modify: `apps/frontend/src/lib/components/schedule/schedule-view.ts`
- Create: `apps/frontend/src/lib/components/schedule/schedule-view.test.ts`
- Modify: `apps/frontend/src/lib/components/match/match.svelte`
- Modify: `apps/frontend/src/lib/components/match/MatchCard.svelte`

**Interfaces:**
- Produces: `MatchDisplayStatus = 'live' | 'finished' | 'unknown'` and `getMatchDisplayStatus(syncStatus)`.

- [ ] **Step 1: Write the failing mapping test**

```ts
expect(getMatchDisplayStatus('active')).toBe('live');
expect(getMatchDisplayStatus('stopped')).toBe('finished');
expect(getMatchDisplayStatus('completed')).toBe('finished');
expect(getMatchDisplayStatus(null)).toBe('unknown');
```

- [ ] **Step 2: Run RED**

Run `bun test src/lib/components/schedule/schedule-view.test.ts` in `apps/frontend`. Expected: missing export.

- [ ] **Step 3: Implement mapping and badge**

Add `status` to `MatchView`, map it in `toMatchView`, and render a compact shared badge in both match components. Use green styling for `LIVE`, muted styling for `FINISHED`, and neutral outlined styling for `UNKNOWN`.

- [ ] **Step 4: Run GREEN and `pnpm run check`**

Expected: test passes and Svelte check reports 0 errors/0 warnings.

### Task 4: Debounced backend-search combobox

**Files:**
- Create: `apps/frontend/src/lib/schemas/competitor-option.schema.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Create: `apps/frontend/src/routes/api/tournaments/[id]/competitors/+server.ts`
- Create: `apps/frontend/src/lib/utils/debounce.ts`
- Create: `apps/frontend/src/lib/utils/debounce.test.ts`
- Create: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleCompetitorPicker.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.svelte`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.test.ts`

**Interfaces:**
- Produces: `CompetitorOption` union from the design spec.
- Consumes: `/api/tournaments/:id/competitors?type=player|team&query=...`.

- [ ] **Step 1: Write failing proxy and debounce tests**

Test that the server route normalizes player/team results and rejects an invalid type. With fake timers, verify debounce executes only the latest call after 250 ms and exposes cancellation.

- [ ] **Step 2: Run RED**

Run `bun test src/lib/server src/lib/utils`. Expected: missing route/helper behavior.

- [ ] **Step 3: Add typed raw backend search calls**

Use existing `backendFetch` in `createBackendClient` for the two new searches, URL-encoding `query` and requesting `limit=20`. Avoid hand-editing generated Orval files.

- [ ] **Step 4: Implement the SvelteKit proxy**

Validate `type`, forward the query, and normalize results to `CompetitorOption[]`. Propagate backend status/message using existing error helpers.

- [ ] **Step 5: Implement the Bits UI 0.22 combobox**

Use `Combobox.Root`, `Combobox.Input`, `Combobox.Content`, and `Combobox.Item` from the installed package. On open, fetch initial results. On input, debounce 250 ms and abort the prior `fetch`. Render avatar/name for players and a users icon/name for teams; render loading, empty, and error rows. Write the selected ID to the existing hidden form field.

- [ ] **Step 6: Replace competitor controls**

Pass `tournamentId` to the form. Replace Player 1/2 and Red/Blue team native selects with `ScheduleCompetitorPicker`; keep `ScheduleUserPicker` for referee, streamer, and commentators. Remove edit-page participant preloading and its 100-player ceiling.

- [ ] **Step 7: Run frontend verification**

Run `pnpm run test:infra`, `pnpm run check`, and `pnpm run build`. Expected: all exit 0.

### Task 5: Final verification and commit

**Files:** all files above.

- [ ] **Step 1: Run final checks**

Run backend tests/build, frontend tests/check/build, `rg -n "request.method === 'GET'" apps/backend/src/modules/auth/policies/resolvers/mappool-policy-context.resolver.ts`, and `git diff --check`. Expected: all commands exit 0; `rg` has no match.

- [ ] **Step 2: Review and commit**

Review the full diff against the approved spec, then commit with `feat: add schedule competitor search`.
