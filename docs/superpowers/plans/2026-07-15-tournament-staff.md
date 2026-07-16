# Tournament Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public and editable tournament Staff roster backed by globally defined staff roles.

**Architecture:** `staff_roles` is a global catalog seeded once by a Drizzle migration. `tournament_staff_members` is the many-to-many association among tournaments, roles, and users. The tournament module exposes grouped staff DTOs and editor-only mutations; SvelteKit obtains that data through the generated SDK and renders it with the participant group/player-card presentation.

**Tech Stack:** PostgreSQL/Drizzle, NestJS with `nestjs-zod`, Svelte 5/SvelteKit, Bun, pnpm, Jest.

## Global Constraints

- Seed exactly these global roles: `Host`, `Referee`, `Mapper`, `Commentator`, `Streamer`, and `Playtester`.
- A user may have several roles in one tournament; duplicate `(tournament_id, role_id, user_id)` assignments are forbidden.
- Do not add role creation, renaming, deletion, or per-tournament role catalogs.
- Reuse the participant group/player-card UI for public staff rendering; add no dependency.
- Writes use the existing tournament update authorization policy.

---

### Task 1: Persist global roles and tournament assignments

**Files:**

- Create: `apps/backend/src/lib/domain/staff-role/staff-role.id.ts`
- Create: `apps/backend/src/lib/infrastructure/db/staff-roles/index.ts`
- Create: `apps/backend/src/lib/infrastructure/db/tournaments/staff-members.ts`
- Modify: `apps/backend/src/lib/infrastructure/db/schema.ts`
- Modify: `apps/backend/scripts/seed-schedule-tournaments.ts`
- Test: `apps/backend/src/lib/infrastructure/db/migration-journal.spec.ts`
- USE DRIZZLE COMMANDS FOR MIGRATION GENERATION AND JOURNAL UPDATE

**Interfaces:**

- Produces `staffRoles` (`id`, unique `name`) and `tournamentStaffMembers` (`tournamentId`, `roleId`, `userId`) Drizzle tables.
- Produces `StaffRoleId` and `staffRoleId(): StaffRoleId` for IDs used by DTOs and schema definitions.
- The seed script consumes the global roles by name and inserts staff assignments after creating each seeded tournament.

- [ ] **Step 1: Write failing migration-journal coverage**

Add an assertion that the migration journal has the new `0019_tournament_staff` entry and that the generated migration SQL creates both tables, their foreign keys, and the composite primary key.

```ts
expect(migrationNames).toContain("0019_tournament_staff");
expect(sql).toContain('CREATE TABLE "staff_roles"');
expect(sql).toContain('CREATE TABLE "tournament_staff_members"');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --dir apps/backend test -- migration-journal.spec.ts`

Expected: FAIL because migration `0019_tournament_staff` does not exist.

- [ ] **Step 3: Add the minimal schema and migration**

Create a CUID2-branded `StaffRoleId`, define the global lookup table and association table with cascading foreign keys, and re-export them from `schema.ts`.

```ts
export const tournamentStaffMembers = pgTable(
  "tournament_staff_members",
  {
    tournamentId: text("tournament_id")
      .notNull()
      .$type<TournamentId>()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .$type<StaffRoleId>()
      .references(() => staffRoles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.tournamentId, table.roleId, table.userId] }),
  ],
);
```

Generate the migration with `pnpm --dir apps/backend migration:generate` and retain every generated SQL, snapshot, and journal change exactly as Drizzle produces it. Do not manually edit a migration or `drizzle/meta/_journal.json`. Seed the six global roles with a separate idempotent application-level seed step rather than SQL inserted into the migration.

- [ ] **Step 4: Extend the local seed script**

Import `staffRoles` and `tournamentStaffMembers`. Upsert the six global role names by their unique `name` before creating tournaments, fetch the roles once by name inside `main`, and pass a name-to-ID map to `createTournamentSeed`. Insert a compact set of assignments after the tournament is created; include at least one user in two roles so the seed demonstrates multi-role support.

```ts
await db.insert(tournamentStaffMembers).values([
  {
    tournamentId: tournament,
    roleId: roles.get("Host")!,
    userId: params.hostId,
  },
  {
    tournamentId: tournament,
    roleId: roles.get("Referee")!,
    userId: staffUsers.referee.id,
  },
  {
    tournamentId: tournament,
    roleId: roles.get("Streamer")!,
    userId: staffUsers.streamer.id,
  },
]);
```

- [ ] **Step 5: Verify persistence changes**

Run: `pnpm --dir apps/backend test -- migration-journal.spec.ts`

Expected: PASS.

Run: `pnpm --dir apps/backend build`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/lib/domain/staff-role apps/backend/src/lib/infrastructure/db apps/backend/drizzle apps/backend/scripts/seed-schedule-tournaments.ts
git commit -m "feat: add tournament staff persistence"
```

### Task 2: Expose and mutate tournament staff through the backend API

**Files:**

- Modify: `apps/backend/src/modules/tournament/dto/index.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Test: `apps/backend/src/modules/tournament/tournament.service.spec.ts`
- Test: `apps/backend/src/modules/tournament/dto/index.spec.ts`

**Interfaces:**

- Produces `TournamentStaffRoleDto`: `{ id: StaffRoleId; name: string; members: TournamentParticipantDto[] }`.
- Produces `AssignTournamentStaffDto`: `{ roleId: StaffRoleId; userId: UserId }`.
- Adds `getStaff({ id })`, `assignStaff({ id, roleId, userId })`, and `removeStaff({ id, roleId, userId })` to `TournamentService`.
- Adds `GET /tournaments/:id/staff`, `POST /tournaments/:id/staff`, and `DELETE /tournaments/:id/staff/:roleId/:userId`.

- [ ] **Step 1: Write failing DTO and service tests**

Add DTO tests for the grouped response and an assignment payload with CUID2 IDs. Add service tests that assert roles with no members are returned, the grouping attaches encoded player avatars, a duplicate insert propagates a conflict, and deletion is scoped by tournament, role, and user.

```ts
expect(await service.getStaff({ id: tournamentId })).toEqual([
  { id: hostRoleId, name: "Host", members: [] },
]);
expect(query.where).toHaveBeenCalledWith(
  and(
    eq(tournamentStaffMembers.tournamentId, tournamentId),
    eq(tournamentStaffMembers.roleId, hostRoleId),
    eq(tournamentStaffMembers.userId, userId),
  ),
);
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `pnpm --dir apps/backend test -- tournament.service.spec.ts dto/index.spec.ts`

Expected: FAIL because staff DTOs and service methods are absent.

- [ ] **Step 3: Implement the minimal DTOs, service methods, and routes**

Use one left join from `staffRoles` to assignments and `users`, ordered by role name and username; group rows in `getStaff` so every global role appears once, including an empty `members` array. `assignStaff` first validates that the tournament exists and inserts the row. `removeStaff` deletes using all three IDs and throws the existing scoped-not-found exception if no row is returned.

```ts
@Post(':id/staff')
@UseGuards(JwtUserGuard, PoliciesGuard)
@CheckPolicies((ability, context) => ability.can('update', context.subjectData))
public async assignStaff(
  @Param('id', TournamentIdPipe) id: TournamentId,
  @Body() body: AssignTournamentStaffDto,
) {
  await this.tournamentService.assignStaff({ id, ...body });
  return this.tournamentService.getStaff({ id });
}
```

Apply the same guards and update policy to deletion. Keep `GET` public, matching tournament page data.

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `pnpm --dir apps/backend test -- tournament.service.spec.ts dto/index.spec.ts`

Expected: PASS.

Run: `pnpm --dir apps/backend build`

Expected: exit code 0.

- [ ] **Step 5: Refresh frontend API artifacts**

Start the backend against the migrated local database, then run:

```bash
pnpm --dir apps/frontend api:refresh
pnpm --dir apps/frontend api:check
```

Expected: generated endpoint/model files include the three staff endpoints and `api:check` exits 0 without a diff.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/tournament apps/frontend/openapi/backend.json apps/frontend/src/lib/server/backend/generated apps/frontend/src/lib/api/generated/model
git commit -m "feat: expose tournament staff API"
```

### Task 3: Render the public Staff tab with the existing roster presentation

**Files:**

- Create: `apps/frontend/src/routes/events/[slug]/components/RosterGroups.svelte`
- Create: `apps/frontend/src/routes/events/[slug]/components/StaffTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/ParticipantsTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/+page.svelte`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts`
- Test: `apps/frontend/src/routes/events/[slug]/components/StaffTab.test.ts`

**Interfaces:**

- `RosterGroups.svelte` accepts `groups: Array<{ id: string; name: string; members: TournamentParticipantDto[] }>` and renders `Group` + `PlayerCard` links.
- `StaffTab.svelte` accepts `staff: TournamentStaffRoleDto[]` and supplies role groups to `RosterGroups`.
- `createBackendClient().tournaments.staff` exposes generated `get`, `assign`, and `remove` calls.

- [ ] **Step 1: Write a failing Staff tab test**

Render the tab with a Host role containing one member and a Mapper role without members. Assert both role headings are visible, the Host player card has the expected username/link, and no player card is rendered for Mapper.

```ts
expect(screen.getByText("Host")).toBeTruthy();
expect(screen.getByText("Mapper")).toBeTruthy();
expect(screen.getByRole("link", { name: /alice/i }).getAttribute("href")).toBe(
  "/users/user-id",
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --dir apps/frontend test:infra -- StaffTab.test.ts`

Expected: FAIL because `StaffTab.svelte` does not exist.

- [ ] **Step 3: Implement shared public roster rendering and data loading**

Extract only the team `Group`/`PlayerCard` loop into `RosterGroups.svelte`, update the team branch of `ParticipantsTab.svelte` to use it, and create `StaffTab.svelte` using the same component. Add `staff` to the public page's tab union, URL helpers, page data type, and content. Fetch staff in parallel in `getTournamentPage`.

```svelte
<RosterGroups
  groups={staff.map((role) => ({ id: role.id, name: role.name, members: role.members }))}
/>
```

Empty roles remain visible; this makes the six global roles discoverable even before staff is assigned.

- [ ] **Step 4: Run frontend checks**

Run: `pnpm --dir apps/frontend test:infra -- StaffTab.test.ts`

Expected: PASS.

Run: `pnpm --dir apps/frontend check`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/events/'[slug]' apps/frontend/src/lib/server/backend/client.ts apps/frontend/src/lib/server/services/tournaments/tournament-page.query.ts
git commit -m "feat: show tournament staff"
```

### Task 4: Add staff assignments to the tournament editor

**Files:**

- Create: `apps/frontend/src/routes/events/[slug]/edit/components/StaffTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/types/tournament-edit-action.ts`
- Test: `apps/frontend/src/lib/schemas/tournament-edit.schema.test.ts`

**Interfaces:**

- Produces `assignTournamentStaffFormSchema` and `removeTournamentStaffFormSchema`, both requiring non-empty `roleId` and `userId`.
- Adds `assignTournamentStaff` and `removeTournamentStaff` form actions.
- `StaffTab.svelte` consumes `staff: TournamentStaffRoleDto[]` and action results.

- [ ] **Step 1: Write failing form-schema tests**

Add tests proving assignment accepts a role ID plus a user ID, removal accepts the same pair, and either schema rejects an empty ID.

```ts
expect(
  assignTournamentStaffFormSchema.safeParse({ roleId: "", userId: "user" })
    .success,
).toBe(false);
expect(
  removeTournamentStaffFormSchema.safeParse({ roleId: "role", userId: "" })
    .success,
).toBe(false);
```

- [ ] **Step 2: Run the schema tests to verify they fail**

Run: `pnpm --dir apps/frontend test:infra -- tournament-edit.schema.test.ts`

Expected: FAIL because the staff form schemas are not exported.

- [ ] **Step 3: Implement minimal editor wiring and UI**

Load staff alongside the existing editor data. Add `staff` to the edit tab union and render an editor `StaffTab`. For each role, show current members and a small form containing a role ID plus `ScheduleUserPicker` configured for a single user; submit to `?/assignTournamentStaff`. Put a remove button/form beside each assignment that submits `roleId` and `userId` to `?/removeTournamentStaff`.

```ts
assignTournamentStaff: (event) =>
  withFormValues(event, (values) =>
    submitForm(
      event,
      "assignTournamentStaff",
      assignTournamentStaffFormSchema,
      values,
      { userId: stringValue(values.userId) },
      (backend, input) =>
        commands.assignTournamentStaff(backend, event.params.slug, input),
    ),
  );
```

Extend `EditAction` and its context with `roleId` so only the affected role/action displays an error. Reuse the existing `lookupSelectedUser` flow through `ScheduleUserPicker`; do not create a second search implementation.

- [ ] **Step 4: Run frontend verification**

Run: `pnpm --dir apps/frontend test:infra -- tournament-edit.schema.test.ts`

Expected: PASS.

Run: `pnpm --dir apps/frontend check`

Expected: exit code 0.

- [ ] **Step 5: Run the final targeted verification**

Run:

```bash
pnpm --dir apps/backend test -- migration-journal.spec.ts tournament.service.spec.ts dto/index.spec.ts
pnpm --dir apps/backend build
pnpm --dir apps/frontend test:infra
pnpm --dir apps/frontend check
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/routes/events/'[slug]'/edit apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts apps/frontend/src/lib/schemas/tournament-edit.schema.ts apps/frontend/src/lib/types/tournament-edit-action.ts
git commit -m "feat: manage tournament staff"
```

## Plan self-review

- Spec coverage: Tasks 1–2 cover the global catalog, association constraint, authorization, API, migration, and seed. Task 3 covers the public Staff tab and reusable roster UI. Task 4 covers editor assignment/removal and final checks.
- Placeholder scan: no `TBD`, `TODO`, deferred implementation, or unspecified validation steps remain.
- Type consistency: all consumers use `TournamentStaffRoleDto`, `roleId`, and `userId`; generated API methods are surfaced under `tournaments.staff` before page/query consumers use them.
