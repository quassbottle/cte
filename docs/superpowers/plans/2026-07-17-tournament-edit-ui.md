# Tournament Edit UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make staff removal, participant management, and qualification lobby creation consistent with the existing tournament edit UI.

**Architecture:** Reuse the existing Svelte modal and card patterns. Keep withdrawal on the existing qualification management endpoints, add scoped host/admin delete endpoints for unregistering solo entrants and teams, and keep lobby creation on the existing action.

**Tech Stack:** NestJS, Drizzle ORM, SvelteKit, Svelte 4 syntax, Zod, Orval.

## Global Constraints

- Preserve the uncommitted partial user lookup fix.
- Do not add UI libraries or generic modal abstractions.
- Qualification seeds remain calculated, not manually editable.

---

### Task 1: Staff removal confirmation

**Files:**

- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/StaffTab.svelte`

**Interfaces:**

- Consumes: existing `?/removeTournamentStaff` action with `roleId` and `userId`.
- Produces: a destructive confirmation modal that closes only after a successful enhanced form submission.

- [ ] Replace inline Remove forms with buttons that select the role/member to remove.
- [ ] Render the existing modal shell with Cancel and Remove staff actions.
- [ ] Show the existing action error inside the modal and close it on success.
- [ ] Run `bun run check` from `apps/frontend`.

### Task 2: Managed roster cards and unregister API

**Files:**

- Modify: `apps/backend/src/modules/tournament/tournament.service.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.controller.ts`
- Modify: `apps/backend/src/modules/tournament/tournament.service.spec.ts`
- Modify: `apps/frontend/openapi/backend.json`
- Regenerate: `apps/frontend/src/lib/server/backend/generated/endpoints.ts`
- Modify: `apps/frontend/src/lib/server/backend/client.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.commands.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/+page.server.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/types/tournament-edit-action.ts`
- Replace: `apps/frontend/src/routes/events/[slug]/edit/components/ParticipantsTab.svelte`

**Interfaces:**

- Consumes: `PATCH .../manage` for Withdraw/Restore.
- Produces: `DELETE /api/tournaments/:id/participants/:userId/manage` and `DELETE /api/tournaments/:id/teams/:teamId/manage`, both returning the refreshed qualification roster.

- [ ] Add failing service tests proving solo/team deletion is tournament-scoped and invalidates qualification results.
- [ ] Implement the two scoped service delete methods and controller routes under the existing tournament update policy.
- [ ] Refresh the OpenAPI-generated frontend endpoint functions and wire them into `BackendClient`.
- [ ] Add validated SvelteKit actions for solo/team unregister.
- [ ] Remove the obsolete manual seed field from qualification update form parsing.
- [ ] Render the management roster with `Group` and `PlayerCard`, plus Withdraw/Restore and confirmed Unregister controls.
- [ ] Run backend targeted tests/build and frontend check/tests.

### Task 3: Add lobby modal

**Files:**

- Create: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbyForm.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbiesTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`

**Interfaces:**

- Consumes: existing `?/createQualificationLobby` action and the active qualification stage/referee list.
- Produces: an Add lobby button in the schedule toolbar and a responsive modal form.

- [ ] Move only the create-lobby fields into a two-column responsive form component.
- [ ] Change the schedule toolbar action to Add lobby for a qualification stage.
- [ ] Open the form in the existing schedule modal shell and close it after a successful submission or Cancel.
- [ ] Leave existing lobby cards and edit forms unchanged.
- [ ] Run frontend formatting, check, and tests.

### Task 4: Verification and graph refresh

**Files:**

- Update: `graphify-out/` through the project command.

**Interfaces:**

- Consumes: all preceding implementation changes.
- Produces: verified source and current code graph.

- [ ] Run `git diff --check`.
- [ ] Run affected backend tests, backend build/lint, frontend `check`, and frontend infrastructure tests.
- [ ] Run `graphify update .`.
