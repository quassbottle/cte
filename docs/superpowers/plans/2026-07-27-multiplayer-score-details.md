# Multiplayer Score Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep an open lobby dialog current after sync and render required score details with a reusable colored rank badge.

**Architecture:** Resolve dialog state by lobby id against refreshed props. Validate required score fields once at the shared score-row boundary, then compose the existing mod badge, formatted combo/accuracy, and a new rank badge.

**Tech Stack:** Svelte 5, TypeScript, Tailwind CSS, Bun test.

## Global Constraints

- Do not add dependencies.
- `mods`, `maxCombo`, `accuracy`, and `rank` are non-null throughout the typed data flow.
- `XH/X` display as `SS`; `SH/S` display as `S`; hidden variants use silver letters.

---

### Task 1: Fresh lobby and required score contracts

**Files:**
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby-view.ts`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/qualificationLobby-view.test.ts`
- Modify: `apps/frontend/src/lib/components/qualificationLobby/QualificationLobbyTable.svelte`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/multiplayerScore.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/multiplayerScore.test.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/playerMultiplayerScore.svelte`

**Interfaces:**
- Produces: `findQualificationLobby(lobbies, id)` returning the current matching lobby or `null`.
- Produces: a non-null score contract from Drizzle schema through generated frontend types.

- [ ] Write failing tests for refreshed lobby lookup and every required score field.
- [ ] Run the focused Bun tests and confirm expected failures.
- [ ] Implement both helpers and wire the table/dialog and score row to them.
- [ ] Run the focused Bun tests and confirm they pass.

### Task 2: Rank badge

**Files:**
- Create: `apps/frontend/src/lib/components/rank/rank.ts`
- Create: `apps/frontend/src/lib/components/rank/rank.test.ts`
- Create: `apps/frontend/src/lib/components/rank/rank.svelte`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/playerMultiplayerScore.svelte`

**Interfaces:**
- Produces: `getRankDisplay(rank)` returning the normalized label and Tailwind variant classes.
- Produces: `Rank` component accepting `rank: string` and optional `class`.

- [ ] Write a failing test for `XH/X/SH/S/A/B/C/D/F` labels and hidden silver variants.
- [ ] Run the focused test and confirm the missing implementation failure.
- [ ] Implement the minimal rank mapping/component and replace inline rank markup.
- [ ] Run focused tests, frontend check, frontend build, and `git diff --check`.
- [ ] Run `graphify update .`.
