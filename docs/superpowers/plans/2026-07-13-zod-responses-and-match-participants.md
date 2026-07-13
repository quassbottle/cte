# Zod Responses and Match Participants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove manual response DTO serialization, centralize mappool management authorization, and restrict solo match players to registered tournament participants.

**Architecture:** Backend controllers declare response DTOs only through `ZodResponse`, leaving serialization to the installed global interceptor. Existing policy resolution owns mappool management authorization. Solo match integrity is enforced in `MatchService`, while the editor receives tournament participants and offers only those users as players.

**Tech Stack:** NestJS 11, nestjs-zod 5.4, Zod 4, Drizzle ORM, Jest 30, SvelteKit 2, Svelte 5.

## Global Constraints

- Add no dependencies or new framework abstractions.
- Keep untyped `ApiResponse` declarations for `void` endpoints.
- Do not change non-controller parsing used for request validation, external APIs, environment configuration, or service data shaping.
- Staff lookup remains global; only solo match players are tournament-restricted.
- Preserve the user's unrelated `.gitignore` change.

---

### Task 1: Controller response serialization

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Modify: `apps/backend/src/modules/mappool/mappool.controller.ts`
- Modify: `apps/backend/src/modules/osu/osu.controller.ts`
- Modify: `apps/backend/src/modules/stage/stage.controller.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`

**Interfaces:**
- Consumes: DTO classes created by `createZodDto` and the global `ZodSerializerInterceptor` from `apps/backend/src/app.module.ts`.
- Produces: Every typed response declared as `@ZodResponse({ status, description, type: Dto | [Dto] })`.

- [ ] **Step 1: Capture the failing structural check**

Run:

```bash
rg -n --glob '*.controller.ts' 'type: .*\.Output|return .*DtoSchema\.parse|\.map\(.*DtoSchema\.parse|ApiOkResponse' apps/backend/src
```

Expected: matches in tournament, mappool, stage, osu, and auth controllers.

- [ ] **Step 2: Replace decorators and manual parsing**

Use the existing working form:

```ts
@ZodResponse({
  status: 200,
  description: 'Returns mappools list.',
  type: [MappoolDto],
})
public async findMany(@Query() query: PaginationDto): Promise<MappoolDto[]> {
  return this.mappoolService.findMany(query);
}
```

For responses with computed fields, retain object construction but remove only parsing:

```ts
return tournaments.map((tournament) => ({
  ...tournament,
  participantsCount: participantsCountByTournamentId.get(tournament.id) ?? 0,
}));
```

- [ ] **Step 3: Format and compile backend**

Run:

```bash
pnpm exec prettier --write src/modules/auth/auth.controller.ts src/modules/mappool/mappool.controller.ts src/modules/osu/osu.controller.ts src/modules/stage/stage.controller.ts src/modules/tournament/tournament.controller.ts
pnpm run build
```

Working directory: `apps/backend`. Expected: exit 0.

- [ ] **Step 4: Verify the structural check is clean**

Run the Step 1 `rg` command again. Expected: no matches. Typed `ApiResponse` blocks must also be absent; the two untyped tournament `void` responses remain.

### Task 2: Mappool management policy

**Files:**
- Modify: `apps/backend/src/modules/auth/policies/resolvers/mappool-policy-context.resolver.ts`
- Modify: `apps/backend/src/modules/mappool/mappool.controller.ts`

**Interfaces:**
- Consumes: request params `{ tournamentId }`, existing `PoliciesGuard`, and existing `Mappool` update ability.
- Produces: policy context for `GET /tournaments/:tournamentId/mappools/manage`.

- [ ] **Step 1: Add resolver coverage for management GET**

Extend the resolver route predicate narrowly:

```ts
const isManagementRoute =
  request.method === 'GET' && /\/mappools\/manage(?:\/|$)/.test(route);
return isMappoolRoute && (isManagementRoute || ['POST', 'PATCH', 'DELETE'].includes(request.method));
```

Add a params schema and select the tournament directly for this route:

```ts
const tournamentMappoolParamsSchema = z.object({
  tournamentId: tournamentIdSchema,
});

if (request.method === 'GET') {
  return this.resolveTournamentById(
    tournamentMappoolParamsSchema.parse(request.params).tournamentId,
  );
}
```

The query must filter `isNull(tournaments.deletedAt)` and return `creatorId` plus `archivedAt`.

- [ ] **Step 2: Replace controller authorization**

Decorate `findByTournamentForManagement`:

```ts
@UseGuards(JwtUserGuard, PoliciesGuard)
@CheckPolicies((ability, context) =>
  ability.can('update', context.subjectData),
)
```

Remove `RequestUser`, `DbUser`, `ForbiddenException`, `TournamentService`, its constructor dependency, and both manual checks from this controller.

- [ ] **Step 3: Compile backend**

Run `pnpm run build` in `apps/backend`. Expected: exit 0.

### Task 3: Backend solo participant integrity

**Files:**
- Create: `apps/backend/src/modules/match/match.service.spec.ts`
- Modify: `apps/backend/src/modules/match/match.service.ts`

**Interfaces:**
- Consumes: `ScheduleMatchUpsertInput['players']`, `soloParticipants`, and route `TournamentId`.
- Produces: `assertMatchCompetitors` rejects any solo player not registered in that tournament before create/update transactions.

- [ ] **Step 1: Write the failing regression test**

Instantiate `MatchService` with a minimal Drizzle fake. Invoke the competitor assertion through a typed test-only view:

```ts
const service = new MatchService(drizzle as never, {} as never);
const assertCompetitors = (
  service as unknown as {
    assertMatchCompetitors(id: TournamentId, data: ScheduleMatchUpsertInput): Promise<void>;
  }
).assertMatchCompetitors.bind(service);

await expect(assertCompetitors(tournamentId, soloDataWithForeignPlayer)).rejects.toMatchObject({
  internalErrorCode: MatchExceptionCode.MATCH_ACCESS_DENIED,
});
```

The fake returns a solo tournament and only one registered ID for two requested player IDs.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm test -- match.service.spec.ts --runInBand
```

Working directory: `apps/backend`. Expected: test fails because the current solo branch returns without querying registrations.

- [ ] **Step 3: Implement one shared backend check**

Import `soloParticipants`. In the solo branch, query IDs for the requested unique player IDs and reject on a count mismatch:

```ts
const playerIds = [...new Set(data.players.map(({ userId }) => userId))];
if (playerIds.length === 0) return;

const registered = await this.drizzle
  .select({ userId: soloParticipants.userId })
  .from(soloParticipants)
  .where(
    and(
      eq(soloParticipants.tournamentId, tournamentId),
      inArray(soloParticipants.userId, playerIds),
    ),
  );

if (registered.length !== playerIds.length) {
  throw new MatchException(
    'Players must participate in the tournament',
    MatchExceptionCode.MATCH_ACCESS_DENIED,
  );
}
```

- [ ] **Step 4: Run GREEN and backend suite**

Run the targeted command from Step 2, then `pnpm test -- --runInBand` and `pnpm run build` in `apps/backend`. Expected: all exit 0.

### Task 4: Tournament-only player picker

**Files:**
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleUserPicker.svelte`

**Interfaces:**
- Consumes: `TournamentParticipantDtoOutput[]` returned by the tournament participants endpoint.
- Produces: optional `options: SelectedUser[]` on `ScheduleUserPicker`; solo player pickers pass it, staff pickers do not.

- [ ] **Step 1: Load all supported participants for the editor**

Allow participant query params in the client and request the endpoint maximum:

```ts
getParticipants: (id: string, params?: TournamentControllerGetParticipantsParams) =>
  tournamentControllerGetParticipants(id, params, options),
```

Add the participant request to the edit query's `Promise.all` for solo tournaments using `{ limit: 100 }`, and return `participants` with the page data. Team tournaments return `[]` because they use team selectors.

- [ ] **Step 2: Thread participants to the form**

Add `participants` props through `+page.svelte`, `ScheduleTab.svelte`, and `ScheduleMatchForm.svelte`. Pass `options={participants}` only to Player 1 and Player 2 instances.

- [ ] **Step 3: Add native select mode to the existing picker**

Add:

```ts
export let options: SelectedUser[] | undefined = undefined;
```

When `options` exists, render a native select that calls `addUser` for the selected ID; otherwise preserve the current lookup UI for staff. Keep the existing selected-user chips and hidden form value.

- [ ] **Step 4: Verify frontend and full structural cleanup**

Run in `apps/frontend`:

```bash
pnpm run check
pnpm run test:infra
pnpm run build
```

Then run from the repository root:

```bash
rg -n --glob '*.controller.ts' 'type: .*\.Output|DtoSchema\.parse|ApiOkResponse' apps/backend/src
git diff --check
```

Expected: all commands exit 0 and the structural search has no matches.
