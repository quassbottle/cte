# Qualification Schedule Editing

## Goal

Make qualification lobbies look identical in tournament view and edit pages. Editing adds controls without replacing the shared schedule table with inline forms.

## Design

- Both pages render the existing `QualificationLobbyTable`.
- `QualificationLobbyTable` accepts `canEdit`, defaulting to `false`.
- Every lobby keeps its existing `Open` button and history dialog.
- When `canEdit` is true, the actions column also shows an `Edit` button.
- `Edit` opens a separate dialog containing the existing lobby fields: number, referee, start time, end time, and multiplayer room URL.
- Start/Stop and Delete actions move into the edit dialog.
- Successful form actions use the existing SvelteKit actions and refresh the page data; no backend API changes are required.
- The old edit-only grid of expanded lobby cards and inline forms is removed.

## Ordinary Matches

The existing shared `schedule.svelte` continues to render ordinary matches in both modes. Its `editable` prop is renamed to `canEdit` for consistency; existing edit/delete action slots remain unchanged.

## Verification

- Frontend type checking and production build pass.
- Public qualification schedule remains unchanged.
- Edit qualification schedule uses the same table and history dialog.
- Edit dialog submits update, Start/Stop, and Delete through the existing actions.
