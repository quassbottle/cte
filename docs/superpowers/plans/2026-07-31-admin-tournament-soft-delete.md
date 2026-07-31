# Admin Tournament Soft Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let site administrators soft-delete active or archived tournaments, browse them in an admin-only Deleted tab, and open their read-only detail pages without exposing deleted data to other viewers.

**Architecture:** Extend the existing tournament status/read flow instead of adding parallel admin endpoints. Optional JWT authentication identifies an administrator on public GET requests, while a reusable tournament-visibility guard hides deleted tournament resources from every other viewer; existing services opt into deleted rows only after that boundary check.

**Tech Stack:** NestJS 11, Passport JWT, CASL, Drizzle ORM, Zod/nestjs-zod, SvelteKit 2, Svelte 5, Bun test, Jest.

## Global Constraints

- Only a site user with `role === 'admin'` may soft-delete or read deleted tournaments.
- Active and archived reads remain public.
- A deleted detail or child-resource request by a non-admin returns not found.
- Deleted list requests by a non-admin return forbidden without tournament data.
- Soft delete works for active and archived tournaments and remains one-way.
- Deleted detail pages are read-only.
- Reuse the existing `deleted_at` column and `DELETE /tournaments/:id`; create no migration.
- Do not disable or weaken authentication, policy, or CSRF checks.
- Add no dependencies and no speculative restore flow.

---

### Task 1: Tournament status, service filters, and delete permission

**Files:**
- Modify: `apps/backend/src/modules/tournament/dto/index.ts`
- Modify: `apps/backend/src/modules/tournament/dto/index.spec.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.spec.ts`
- Modify: `apps/backend/src/modules/auth/policies/ability.factory.ts`
- Modify: `apps/backend/src/modules/auth/policies/ability.factory.spec.ts`
- Modify: `apps/backend/src/modules/auth/policies/resolvers/tournament-policy-context.resolver.ts`
- Modify: `apps/backend/src/modules/auth/policies/resolvers/tournament-policy-context.resolver.spec.ts`

**Interfaces:**
- Consumes: existing `tournaments.deletedAt`, `TournamentService.findMany`, `TournamentService.getById`, and `AppAbilityFactory`.
- Produces: `status: 'active' | 'archived' | 'deleted'`; `getById({ id, includeDeleted?: boolean })`; read helpers that forward `includeDeleted`; admin-only tournament delete ability.

- [ ] **Step 1: Write failing DTO, service, and policy tests**

Add these focused assertions:

```ts
it('accepts the deleted tournament status', () => {
  expect(findTournamentsDtoSchema.parse({ status: 'deleted' }).status).toBe(
    'deleted',
  );
});
```

```ts
it('includes deleted rows only when explicitly requested', async () => {
  let condition: unknown;
  const findFirst = jest.fn(({ where }: { where: unknown }) => {
    condition = where;
    return Promise.resolve({ id: 'tournament-1', deletedAt: new Date() });
  });
  const service = tournamentService({
    query: { tournaments: { findFirst } },
  } as never);

  await service.getById({
    id: 'tournament-1' as never,
    includeDeleted: true,
  });

  expect(containsValue(condition, tournaments.deletedAt)).toBe(false);
});

it('soft-deletes archived tournaments', async () => {
  let condition: unknown;
  const returning = jest.fn().mockResolvedValue([
    { id: 'tournament-1', archivedAt: new Date() },
  ]);
  const where = jest.fn((value: unknown) => {
    condition = value;
    return { returning };
  });
  const set = jest.fn(() => ({ where }));
  const service = tournamentService({
    update: jest.fn(() => ({ set })),
  } as never);

  await service.softDelete({ id: 'tournament-1' as never });

  expect(containsValue(condition, tournaments.archivedAt)).toBe(false);
  expect(set).toHaveBeenCalledWith({ deletedAt: expect.any(Date) });
});
```

```ts
it('does not allow a tournament creator to delete a tournament', () => {
  const ability = new AppAbilityFactory().createForUser({
    id: 'creator-id',
    role: 'default',
  } as never);
  const tournament = {
    __type: 'Tournament',
    creatorId: 'creator-id',
  } as never;

  expect(ability.can('update', tournament)).toBe(true);
  expect(ability.can('delete', tournament)).toBe(false);
});
```

Add a resolver test whose request is `DELETE /tournaments/tournament-1`, whose
database tournament has a non-null `archivedAt`, and assert that `resolve`
returns the Tournament policy subject instead of throwing the archived access
error.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/tournament/dto/index.spec.ts \
  modules/tournament/tournament.service.spec.ts \
  modules/auth/policies/ability.factory.spec.ts \
  modules/auth/policies/resolvers/tournament-policy-context.resolver.spec.ts
```

Expected: failures because `deleted` is rejected, `includeDeleted` does not exist, archived rows remain in the soft-delete predicate, and creators still receive delete permission.

- [ ] **Step 3: Implement the minimum backend behavior**

Change the status schema:

```ts
status: z
  .enum(['active', 'archived', 'deleted'])
  .optional()
  .default('active'),
```

Use one status predicate in `findMany`:

```ts
const statusFilter =
  status === 'deleted'
    ? isNotNull(tournaments.deletedAt)
    : and(
        isNull(tournaments.deletedAt),
        status === 'archived'
          ? isNotNull(tournaments.archivedAt)
          : isNull(tournaments.archivedAt),
      );

const found = await this.drizzle.query.tournaments.findMany({
  where: and(
    statusFilter,
    mode ? eq(tournaments.mode, mode) : undefined,
  ),
  orderBy: asc(tournaments.startsAt),
  limit,
  offset,
});
```

Make the core lookup explicit and thread it only through public detail helpers:

```ts
public async getById(params: {
  id: TournamentId;
  includeDeleted?: boolean;
}): Promise<DbTournament> {
  const { id, includeDeleted = false } = params;
  const tournament = await this.drizzle.query.tournaments.findFirst({
    where: and(
      eq(tournaments.id, id),
      includeDeleted ? undefined : isNull(tournaments.deletedAt),
    ),
  });
```

Add `includeDeleted?: boolean` to `getParticipants`, `getTeams`, and `getStaff`,
then pass it to their existing `getById` calls. Remove only
`isNull(tournaments.archivedAt)` from `softDelete` so the predicate remains:

```ts
and(eq(tournaments.id, id), isNull(tournaments.deletedAt))
```

Restrict ordinary users to updates:

```ts
can('update', 'Tournament', { creatorId: user.id });
```

Let DELETE reach the ability check for archived tournaments while preserving
the existing mutation lock for every other method:

```ts
if (tournament.archivedAt && request.method !== 'DELETE') {
  throw new TournamentException(
    'Archived tournaments cannot be changed',
    TournamentExceptionCode.TOURNAMENT_ACCESS_DENIED,
  );
}
```

- [ ] **Step 4: Run focused tests and backend type/build verification**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/tournament/dto/index.spec.ts \
  modules/tournament/tournament.service.spec.ts \
  modules/auth/policies/ability.factory.spec.ts \
  modules/auth/policies/resolvers/tournament-policy-context.resolver.spec.ts
pnpm --filter backend build
```

Expected: all focused tests pass and Nest build exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/tournament apps/backend/src/modules/auth/policies
git commit -m "feat(backend): model deleted tournament reads"
```

---

### Task 2: Optional JWT and deleted-resource visibility boundary

**Files:**
- Create: `apps/backend/src/modules/auth/guards/optional-jwt.guard.ts`
- Create: `apps/backend/src/modules/auth/guards/optional-jwt.guard.spec.ts`
- Create: `apps/backend/src/modules/auth/guards/tournament-visibility.guard.ts`
- Create: `apps/backend/src/modules/auth/guards/tournament-visibility.guard.spec.ts`
- Modify: `apps/backend/src/modules/auth/decorators/user.decorator.ts`
- Modify: `apps/backend/src/modules/auth/auth.module.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Modify: `apps/backend/src/modules/stage/stage.controller.ts`
- Modify: `apps/backend/src/modules/mappool/mappool.controller.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-lobby.controller.ts`

**Interfaces:**
- Consumes: bearer JWTs, `RequestWithAuth<DbUser>`, route params named `id` or `tournamentId`, and the tournaments table.
- Produces: `OptionalJwtUserGuard`, `TournamentVisibilityGuard`, and `OptionalRequestUser()`; guarded public tournament detail/child reads.

- [ ] **Step 1: Write failing guard tests**

Cover these concrete behaviors:

```ts
it('keeps requests without Authorization anonymous', () => {
  const guard = new OptionalJwtUserGuard();
  const context = httpContext({ headers: {} });

  expect(guard.canActivate(context)).toBe(true);
});
```

```ts
it('hides a deleted tournament from an anonymous viewer', async () => {
  const guard = visibilityGuard({
    id: 'tournament-1',
    deletedAt: new Date('2026-07-31T00:00:00.000Z'),
  });

  await expect(
    guard.canActivate(httpContext({ params: { id: 'tournament-1' } })),
  ).rejects.toThrow('Tournament not found');
});

it('allows an administrator to read a deleted tournament', async () => {
  const guard = visibilityGuard({
    id: 'tournament-1',
    deletedAt: new Date('2026-07-31T00:00:00.000Z'),
  });

  await expect(
    guard.canActivate(
      httpContext({
        params: { id: 'tournament-1' },
        user: { role: 'admin' },
      }),
    ),
  ).resolves.toBe(true);
});
```

The local `httpContext` helper returns an `ExecutionContext` whose
`switchToHttp().getRequest()` returns the supplied request. The
`visibilityGuard` helper constructs the guard with a Drizzle mock whose
`findFirst` returns the supplied tournament.

- [ ] **Step 2: Run guard tests and verify RED**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/auth/guards/optional-jwt.guard.spec.ts \
  modules/auth/guards/tournament-visibility.guard.spec.ts
```

Expected: Jest cannot resolve the two new guard modules.

- [ ] **Step 3: Implement optional authentication and visibility**

Create the optional guard so absent credentials stay public while invalid
credentials still use the normal JWT failure path:

```ts
@Injectable()
export class OptionalJwtUserGuard extends JwtUserGuard {
  public canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    return request.headers.authorization
      ? super.canActivate(context)
      : true;
  }
}
```

Add a non-throwing decorator beside `RequestUser`:

```ts
export const OptionalRequestUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity | undefined =>
    ctx
      .switchToHttp()
      .getRequest<RequestWithAuth<UserEntity>>().user,
);
```

Create `TournamentVisibilityGuard`:

```ts
@Injectable()
export class TournamentVisibilityGuard implements CanActivate {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      RequestWithAuth<DbUser> & {
        method: string;
        params: { id?: string; tournamentId?: string };
      }
    >();
    if (request.method !== 'GET') return true;

    const parsed = tournamentIdSchema.safeParse(
      request.params.tournamentId ?? request.params.id,
    );
    if (!parsed.success) return true;

    const tournament = await this.db.query.tournaments.findFirst({
      where: eq(tournaments.id, parsed.data),
    });
    if (
      !tournament ||
      (tournament.deletedAt && request.user?.role !== 'admin')
    ) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }
    return true;
  }
}
```

Register and export both guards from `AuthModule`. Apply
`@UseGuards(OptionalJwtUserGuard, TournamentVisibilityGuard)` at controller
class level to `TournamentController`, `StageController`,
`TournamentMappoolController`, `QualificationResultsController`, and
`QualificationLobbyController`. Existing method-level mutation guards remain
unchanged and continue running after the controller-level guards.

- [ ] **Step 4: Run guard tests and affected policy tests**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/auth/guards/optional-jwt.guard.spec.ts \
  modules/auth/guards/tournament-visibility.guard.spec.ts \
  modules/auth/policies
pnpm --filter backend build
```

Expected: all tests pass and build exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/auth apps/backend/src/modules/tournament/tournament.controller.ts apps/backend/src/modules/stage/stage.controller.ts apps/backend/src/modules/mappool/mappool.controller.ts apps/backend/src/modules/qualification/qualification-lobby.controller.ts
git commit -m "feat(backend): hide deleted tournament resources"
```

---

### Task 3: Admin-aware tournament list and detail API

**Files:**
- Create: `apps/backend/src/modules/tournament/tournament.controller.spec.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.service.ts`
- Modify: `apps/backend/src/modules/qualification/qualification-results.repository.ts`
- Modify: existing qualification result repository/service specs next to those files
- Modify generated files: `apps/frontend/openapi/backend.json`
- Modify generated files: `apps/frontend/src/lib/server/backend/generated/`
- Modify generated files: `apps/frontend/src/lib/api/generated/model/`

**Interfaces:**
- Consumes: Task 1 `includeDeleted` service parameters and Task 2 optional viewer/visibility guard.
- Produces: admin-only `status=deleted`; admin-readable deleted detail, participants, teams, staff, and qualification statistics; refreshed generated frontend types.

- [ ] **Step 1: Write failing controller and qualification-statistics tests**

The controller unit test directly calls methods with a mocked service:

```ts
it('forbids the deleted list for a non-admin', async () => {
  await expect(
    controller.findMany(
      { limit: 20, offset: 0, status: 'deleted' },
      { role: 'default' } as never,
    ),
  ).rejects.toBeInstanceOf(ForbiddenException);
});

it('includes deleted detail data for an admin', async () => {
  await controller.getById(
    'tournament-1' as never,
    { role: 'admin' } as never,
  );

  expect(service.getById).toHaveBeenCalledWith({
    id: 'tournament-1',
    includeDeleted: true,
  });
});
```

Add a qualification repository test proving `includeDeleted: true` omits the
`tournaments.deletedAt` predicate while the default path retains it.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/tournament/tournament.controller.spec.ts \
  modules/qualification/qualification-results.repository.spec.ts
```

Expected: controller signatures do not accept a viewer and qualification reads
cannot opt into a deleted tournament.

- [ ] **Step 3: Thread the validated administrator flag through reads**

Use one controller helper:

```ts
const canReadDeleted = (user?: DbUser) => user?.role === 'admin';
```

`findMany` throws `ForbiddenException` when `query.status === 'deleted'` and
`canReadDeleted(user)` is false. `getById`, `getParticipants`, `getTeams`, and
`getStaff` pass:

```ts
includeDeleted: canReadDeleted(user)
```

Add `@OptionalRequestUser() user?: DbUser` to those controller methods.

Thread `includeDeleted = false` through
`QualificationResultsService.getStatistics`,
`QualificationResultsRepository.findStageId`, and
`QualificationResultsRepository.load`. Their tournament predicate becomes:

```ts
includeDeleted ? undefined : isNull(tournaments.deletedAt)
```

The qualification-results controller passes
`includeDeleted: requestUser?.role === 'admin'` after the visibility guard has
validated access.

- [ ] **Step 4: Refresh OpenAPI-generated frontend code**

In terminal 1, start the backend with its repository environment:

```bash
pnpm --filter backend start:dev
```

After `http://127.0.0.1:3000/docs-json` responds, run in terminal 2:

```bash
BACKEND_OPENAPI_URL=http://127.0.0.1:3000/docs-json \
  pnpm --filter frontend api:refresh
```

Expected: the generated `TournamentControllerFindManyParams` status type
contains `'deleted'`; the generated soft-delete endpoint remains available.
Do not hand-edit generated endpoint or model files.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter backend test -- --runInBand \
  modules/tournament \
  modules/qualification/qualification-results.repository.spec.ts
pnpm --filter backend build
pnpm --filter frontend check
```

Expected: all commands exit 0.

```bash
git add apps/backend/src/modules/tournament apps/backend/src/modules/qualification apps/frontend/openapi/backend.json apps/frontend/src/lib/server/backend/generated apps/frontend/src/lib/api/generated/model
git commit -m "feat(api): expose deleted tournaments to admins"
```

---

### Task 4: Admin-only Deleted tab

**Files:**
- Modify: `apps/frontend/src/lib/utils/events-filter.ts`
- Modify: `apps/frontend/src/routes/events/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/+page.svelte`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-list-page.test.ts`

**Interfaces:**
- Consumes: generated list status `'deleted'`, layout `user.role`, and authenticated `createBackendClient(event)`.
- Produces: `TournamentStatusFilter = 'active' | 'archived' | 'deleted'`; admin-only Deleted tab and request.

- [ ] **Step 1: Write failing frontend load tests**

Add:

```ts
it('loads deleted tournaments for an administrator', async () => {
  const result = (await load({
    fetch,
    locals: {
      session: {
        token: 'token',
        user: { role: 'admin', defaultMode: 'osu' },
      },
    },
    url: new URL('https://example.com/events?status=deleted&mode=all'),
    parent: async () => ({
      user: { role: 'admin', defaultMode: 'osu' },
    }),
  } as never)) as {
    selectedStatus: string;
    tournaments: { input: { status?: string } }[];
  };

  expect(result.selectedStatus).toBe('deleted');
  expect(result.tournaments[0].input.status).toBe('deleted');
});

it('falls back to active when a non-admin requests deleted', async () => {
  const result = (await load({
    fetch,
    locals: { session: null },
    url: new URL('https://example.com/events?status=deleted&mode=all'),
    parent: async () => ({
      user: { role: 'default', defaultMode: 'osu' },
    }),
  } as never)) as {
    selectedStatus: string;
    tournaments: { input: { status?: string } }[];
  };

  expect(result.selectedStatus).toBe('active');
  expect(result.tournaments[0].input.status).toBe('active');
});
```

Update the existing backend-client mock to capture the input while accepting
`createBackendClient(event)`.

- [ ] **Step 2: Run the page-load test and verify RED**

Run:

```bash
cd apps/frontend
bun test src/lib/server/services/tournaments/tournament-list-page.test.ts
```

Expected: `deleted` resolves to `active` for both viewers.

- [ ] **Step 3: Implement status resolution and conditional tab**

Extend the shared type:

```ts
export type TournamentStatusFilter =
  | 'active'
  | 'archived'
  | 'deleted';
```

Resolve status with the viewer:

```ts
const resolveSelectedStatus = (
  value: string | null,
  isAdmin: boolean,
): TournamentStatusFilter => {
  if (value === 'archived') return value;
  if (value === 'deleted' && isAdmin) return value;
  return 'active';
};
```

Change `load` to accept the full `event`, call `await event.parent()`, and use
`createBackendClient(event)` so the backend receives the session bearer token.
Return `isAdmin` with the page data.

Build the status tabs in `+page.svelte` from two public entries plus:

```ts
...(data.isAdmin
  ? [{ value: 'deleted' as const, label: 'Deleted Tournaments' }]
  : [])
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
cd apps/frontend
bun test src/lib/server/services/tournaments/tournament-list-page.test.ts
bun run check
```

Expected: tests pass and Svelte check reports 0 errors.

```bash
git add apps/frontend/src/lib/utils/events-filter.ts apps/frontend/src/routes/events/+page.server.ts apps/frontend/src/routes/events/+page.svelte apps/frontend/src/lib/server/services/tournaments/tournament-list-page.test.ts
git commit -m "feat(frontend): add admin deleted tournaments tab"
```

---

### Task 5: Read-only deleted detail page

**Files:**
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.test.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/info/TournamentHero.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/info/RegistrationControls.svelte`

**Interfaces:**
- Consumes: a `TournamentDto` with nullable `deletedAt` and an admin viewer.
- Produces: `canEditTournament: false` and `canDeleteTournament: false` for deleted rows; visible Deleted label; no registration or edit controls.

- [ ] **Step 1: Write a failing query test**

```ts
test('makes a deleted tournament read-only for an admin', async () => {
  const backend = tournamentPageBackend({
    creatorId: 'owner-id',
    deletedAt: '2026-07-31T00:00:00.000Z',
  });

  const result = await getTournamentPage(
    backend as never,
    'tournament-id',
    { id: 'admin-id', role: 'admin' },
  );

  expect(result.canEditTournament).toBe(false);
  expect(result.canDeleteTournament).toBe(false);
});
```

The local `tournamentPageBackend` helper returns the same empty child responses
already repeated in this spec and accepts the tournament fields to return from
`getById`.

- [ ] **Step 2: Run the query test and verify RED**

Run:

```bash
cd apps/frontend
bun test src/lib/server/services/tournaments/tournament-page.query.test.ts
```

Expected: `canEditTournament` is true and `canDeleteTournament` is absent.

- [ ] **Step 3: Implement read-only state**

Derive permissions once:

```ts
const isAdmin = viewer?.role === 'admin';
const isDeleted = Boolean(tournament.deletedAt);
const canEditTournament =
  !isDeleted &&
  !!viewer &&
  (tournament.creatorId === viewer.id || isAdmin);
const canDeleteTournament = isAdmin && !isDeleted;
```

Return `canDeleteTournament`. In `TournamentHero.svelte`, render a plain
`Deleted` breadcrumb when `tournament.deletedAt` is present. In
`RegistrationControls.svelte`, change the canonical mutation condition to:

```ts
$: canShowRegistrationForm =
  tournament.registrationOpen &&
  !tournament.archivedAt &&
  !tournament.deletedAt;
```

Render `This tournament has been deleted.` before archived/registration-closed
messages. Existing `canEditTournament` handling removes the Edit link.

- [ ] **Step 4: Verify and commit**

Run:

```bash
cd apps/frontend
bun test src/lib/server/services/tournaments/tournament-page.query.test.ts
bun run check
```

Expected: test and Svelte check pass.

```bash
git add apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts apps/frontend/src/lib/server/services/tournaments/tournament-page.query.test.ts apps/frontend/src/routes/events/'[slug]'/+page.svelte apps/frontend/src/routes/events/'[slug]'/components/info/TournamentHero.svelte apps/frontend/src/routes/events/'[slug]'/components/info/RegistrationControls.svelte
git commit -m "feat(frontend): render deleted tournaments read-only"
```

---

### Task 6: Admin soft-delete action and confirmation

**Files:**
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.commands.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.server.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/page.server.test.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/info/types.ts`

**Interfaces:**
- Consumes: generated `tournamentControllerSoftDelete`, Task 5 `canDeleteTournament`, SvelteKit named actions.
- Produces: `backend.tournaments.softDelete(id)`, `deleteTournament(backend, id)`, `?/deleteTournament`, redirect to `/events?status=deleted&mode=all`.

- [ ] **Step 1: Write failing action tests**

```ts
it('rejects tournament deletion by a non-admin', async () => {
  const result = await actions.deleteTournament({
    locals: {
      session: {
        token: 'token',
        user: { id: 'owner-id', role: 'default' },
      },
    },
    params: { slug: 'tournament-1' },
  } as never);

  expect(result).toMatchObject({
    status: 403,
    data: { deleteError: 'Only site administrators can delete tournaments.' },
  });
});

it('soft-deletes a tournament as admin', async () => {
  process.env.BACKEND_API_URL = 'http://backend.test';
  let request: Request | undefined;

  await expect(
    actions.deleteTournament({
      locals: {
        session: {
          token: 'token',
          user: { id: 'admin-id', role: 'admin' },
        },
      },
      params: { slug: 'tournament-1' },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        request = new Request(input, init);
        return Response.json({ id: 'tournament-1' });
      },
    } as never),
  ).rejects.toMatchObject({
    status: 303,
    location: '/events?status=deleted&mode=all',
  });

  expect(request?.method).toBe('DELETE');
});
```

- [ ] **Step 2: Run the page-server test and verify RED**

Run:

```bash
cd apps/frontend
bun test src/routes/events/'[slug]'/page.server.test.ts
```

Expected: `actions.deleteTournament` is undefined.

- [ ] **Step 3: Implement the client, command, and server action**

Import `tournamentControllerSoftDelete` and expose:

```ts
softDelete: (id: string) => tournamentControllerSoftDelete(id, options),
```

Add the command:

```ts
export function deleteTournament(
  backend: BackendClient,
  tournamentId: string,
) {
  return backend.tournaments.softDelete(tournamentId);
}
```

Add the named action:

```ts
deleteTournament: async (event) => {
  if (event.locals.session?.user.role !== 'admin') {
    return fail(403, {
      deleteError: 'Only site administrators can delete tournaments.',
    });
  }

  try {
    await commands.deleteTournament(
      createBackendClient(event),
      event.params.slug,
    );
  } catch (cause) {
    return fail(backendErrorStatus(cause), {
      deleteError: backendErrorMessage(cause, 'Failed to delete tournament.'),
    });
  }

  redirect(303, '/events?status=deleted&mode=all');
},
```

Extend `TournamentRegistrationForm` with `deleteError?: string`.

- [ ] **Step 4: Add the minimal accessible confirmation UI**

In `+page.svelte`, track `isDeleteDialogOpen`, show the destructive button only
when `data.canDeleteTournament`, and submit:

```svelte
<form method="post" action="?/deleteTournament">
  <Button type="submit" variant="destructive">Delete tournament</Button>
</form>
```

The surrounding modal follows the existing Archive dialog pattern:
`role="dialog"`, `aria-modal="true"`, Escape/backdrop close, explicit Cancel,
and text `This action cannot be undone.` Render `form?.deleteError` beside the
button and reopen the dialog when that error exists.

- [ ] **Step 5: Verify and commit**

Run:

```bash
cd apps/frontend
bun test src/routes/events/'[slug]'/page.server.test.ts
bun test src/lib/server/services/tournaments
bun run check
```

Expected: all tests pass and Svelte check reports 0 errors.

```bash
git add apps/frontend/src/lib/server/backend/client.ts apps/frontend/src/lib/server/services/tournaments/tournament-page.commands.ts apps/frontend/src/routes/events/'[slug]'
git commit -m "feat(frontend): add admin tournament deletion"
```

---

### Task 7: Full verification and graph refresh

**Files:**
- Update generated graph artifacts under `graphify-out/` via the required command.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified backend/frontend behavior and a current knowledge graph.

- [ ] **Step 1: Run all relevant backend checks**

```bash
pnpm --filter backend test -- --runInBand
pnpm --filter backend build
```

Expected: Jest reports 0 failures and Nest build exits 0.

- [ ] **Step 2: Run all relevant frontend checks**

```bash
cd apps/frontend
bun run test:infra
bun run check
```

Expected: Bun reports 0 failed tests and Svelte check reports 0 errors.

- [ ] **Step 3: Verify formatting and generated API consistency**

```bash
git diff --check
pnpm --filter frontend api:check
```

Expected: both commands exit 0 with no generated API diff.

- [ ] **Step 4: Update graphify**

```bash
graphify update .
```

Expected: graphify reports `Code graph updated`.

- [ ] **Step 5: Inspect final scope and commit graph updates if tracked**

```bash
git status --short
git diff --stat
```

Expected: only intended feature files and expected `graphify-out/` updates are
present. If graph artifacts are tracked and changed:

```bash
git add graphify-out
git commit -m "chore: refresh code graph"
```
