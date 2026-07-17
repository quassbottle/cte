# Animated Mappool Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add physical card dragging, animated live reordering, and edge autoscroll to mappool management.

**Architecture:** Replace hand-written native drag events with `svelte-dnd-action` handle zones. Keep the existing SvelteKit autosave action and backend endpoint; `consider` previews order and `finalize` saves once.

**Tech Stack:** Svelte 5 legacy syntax, `svelte-dnd-action`, Svelte FLIP animation, Bun test.

## Global Constraints

- Do not change backend persistence or migrations.
- Keep map forms usable by starting drag only from the grip.
- Save once on finalize, not during consider events.

---

### Task 1: Define sortable item conversion

**Files:**
- Modify: `apps/frontend/src/lib/utils/reorder.ts`
- Modify: `apps/frontend/src/lib/utils/reorder.test.ts`

- [ ] Write failing tests for adding stable action IDs and extracting the ordered osu beatmap IDs.
- [ ] Run the focused test and confirm RED.
- [ ] Implement the two minimal conversion helpers and confirm GREEN.

### Task 2: Replace native dragging

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/mappools/MappoolCard.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/mappools/MappoolBeatmapRow.svelte`

- [ ] Install `svelte-dnd-action` with the workspace package manager.
- [ ] Use `dragHandleZone`, `dragHandle`, `consider`, `finalize`, and `animate:flip`.
- [ ] Style the dragged card with shadow, scale, and slight rotation.
- [ ] Reuse pending lock, one-shot autosave, rollback, and error display.
- [ ] Run focused tests and `svelte-check`.

### Task 3: Verify and refresh graph

- [ ] Run frontend infrastructure tests and production build.
- [ ] Run `git diff --check` and inspect the diff.
- [ ] Run `graphify update .`.
