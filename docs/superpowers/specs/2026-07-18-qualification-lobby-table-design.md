# Qualification Lobby Table Design

## Goal

Replace the qualification lobby card grid with the same responsive table shell used by the tournament schedule, while moving synchronized beatmap details into an accessible modal.

## Shared Table Shell

Extract the desktop table container and mobile list container from the existing schedule component into a small reusable `ScheduleTable` component. It exposes slots for the desktop header, desktop rows, and mobile rows. The existing match schedule keeps its current columns and rendering through this shell, so its behavior and appearance do not change.

## Qualification Lobby Summary

Render one row per lobby with:

- lobby number as ID;
- start and end time;
- registered team names for team tournaments, or registered player names for solo tournaments;
- referee name;
- multiplayer-room link;
- synchronization status;
- actions.

The actions column keeps the existing `Select lobby` behavior and adds an `Open` button. Selection capacity rules, pending state, and active-sync polling remain unchanged.

On mobile, render the same summary as a compact list item with the actions available without horizontal scrolling.

## Detail Modal

Selecting `Open` stores the selected lobby in local component state and renders a modal using the project's existing dialog pattern. The modal shows the current detailed lobby content, including synchronization timestamp and attempts grouped by beatmap. It closes by its close button, backdrop click, or Escape and includes `role="dialog"` and `aria-modal="true"`.

The existing qualification lobby card becomes detail content rather than the public list layout. No backend or DTO changes are required.

## Verification

- A focused view/helper test covers team/player labels and grouped attempt data where logic is extracted.
- Existing lobby selection tests remain green.
- Run frontend tests, typecheck, build, `git diff --check`, and `graphify update .`.

## Out of Scope

- Changing lobby registration, capacity, synchronization, or backend APIs.
- Showing individual team members in team tournaments.
