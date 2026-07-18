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

Lobby selection is open only while the qualification stage has not started. At `now >= stage.startsAt`, the frontend disables selection and the backend rejects both solo and team selection with `409 Conflict`, including attempts to reselect or change an existing assignment. The backend performs this check after taking the existing qualification-stage lock so a request cannot cross the start boundary during an assignment transaction. Viewing lobby summaries and details remains available after the stage starts.

On mobile, render the same summary as a compact list item with the actions available without horizontal scrolling.

## Detail Modal

Selecting `Open` stores the selected lobby in local component state and renders a modal using the project's existing dialog pattern. The modal shows the current detailed lobby content, including synchronization timestamp and attempts grouped by beatmap. It closes by its close button, backdrop click, or Escape and includes `role="dialog"` and `aria-modal="true"`.

The existing qualification lobby card becomes detail content rather than the public list layout. No backend or DTO changes are required.

## Verification

- A focused view/helper test covers team/player labels and grouped attempt data where logic is extracted.
- Backend service/repository tests cover rejection at and after `stage.startsAt`; frontend helper tests cover the disabled state.
- Existing lobby selection tests remain green.
- Run frontend tests, typecheck, build, `git diff --check`, and `graphify update .`.

## Out of Scope

- Changing lobby capacity or synchronization behavior.
- Showing individual team members in team tournaments.
