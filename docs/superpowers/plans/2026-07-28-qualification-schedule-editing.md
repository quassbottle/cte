# Qualification Schedule Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the public qualification schedule table on the edit page and move all qualification lobby controls into an edit dialog.

**Architecture:** The shared `QualificationLobbyTable` owns view/history behavior and conditionally exposes an Edit action through `canEdit`. The edit route supplies a focused dialog through the existing action slot and submits to the existing SvelteKit actions. Ordinary matches keep using the shared `Schedule` component with the same `canEdit` naming.

**Tech Stack:** Svelte 4, SvelteKit form actions, TypeScript, shadcn-svelte UI components.

## Global Constraints

- Do not add backend endpoints or dependencies.
- Public schedule markup and behavior must remain unchanged.
- Reuse existing history dialogs and SvelteKit form actions.
- Keep unrelated dirty worktree changes intact.

---

### Task 1: Normalize the shared schedule edit flag

**Files:**

- Modify: `apps/frontend/src/lib/components/schedule/schedule.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`

**Interfaces:**

- Consumes: existing `Schedule` props and action slot.
- Produces: `canEdit: boolean`, default `false`.

- [ ] **Step 1: Rename the prop**

Replace `editable` with `canEdit` in the shared component and its edit-route caller. Preserve the action slot and existing Open behavior.

- [ ] **Step 2: Verify type checking**

Run: `pnpm --filter frontend check`
Expected: exit code 0.

### Task 2: Reuse the qualification lobby table in edit mode

**Files:**

- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyTable.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbiesTab.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`

**Interfaces:**

- Consumes: `QualificationLobbyDtoOutput[]`, `MappoolBeatmapDto[]`, `isTeam`, `canEdit`.
- Produces: the same table in both routes, with an edit action slot rendered only when `canEdit`.

- [ ] **Step 1: Add the edit-mode interface**

Add `canEdit = false` to `QualificationLobbyTable` and render its action slot only in edit mode.

- [ ] **Step 2: Replace the edit-only card grid**

Render `QualificationLobbyTable` from `QualificationLobbiesTab.svelte`, passing the current stage's lobbies, beatmaps, team mode, and `canEdit`.

- [ ] **Step 3: Pass shared data**

Pass `beatmaps` and `isTeam` from the edit schedule route into the qualification tab.

- [ ] **Step 4: Verify type checking**

Run: `pnpm --filter frontend check`
Expected: exit code 0.

### Task 3: Add the qualification lobby edit dialog

**Files:**

- Create: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbyEditDialog.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/QualificationLobbiesTab.svelte`

**Interfaces:**

- Consumes: `lobby: QualificationLobbyDtoOutput`, `referees: TournamentStaffRoleDto['members']`, `onClose: () => void`.
- Produces: forms targeting `?/updateQualificationLobby`, `?/startQualificationLobby`, `?/stopQualificationLobby`, and `?/deleteQualificationLobby`.

- [ ] **Step 1: Build the focused dialog**

Move the existing inline number, referee, time, MP URL, Start/Stop, and Delete forms into a `MultiplayerHistoryDialog`-backed edit dialog.

- [ ] **Step 2: Connect the Edit button**

Track the selected lobby in `QualificationLobbiesTab`, open the dialog from the shared table action slot, and close it through `onClose`.

- [ ] **Step 3: Verify frontend**

Run: `pnpm --filter frontend check && pnpm --filter frontend build`
Expected: both commands exit with code 0.

### Task 4: Final verification

**Files:**

- Verify all modified frontend files.

- [ ] **Step 1: Run repository tests**

Run: `pnpm test`
Expected: exit code 0.

- [ ] **Step 2: Check the diff**

Run: `git diff --check`
Expected: no output.

- [ ] **Step 3: Refresh the knowledge graph**

Run: `graphify update .`
Expected: graph update exits with code 0.
