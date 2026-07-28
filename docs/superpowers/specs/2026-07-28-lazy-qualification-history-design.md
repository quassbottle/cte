# Lazy Qualification History

## Goal

Stop returning every qualification score with the tournament page. Load one lobby's history only when its `Open` action is used.

## Backend

- `QualificationLobbyDto` remains the lightweight schedule row and no longer contains `attempts` or `standings`.
- The lobby list still exposes `syncStatus` and `lastSyncedAt` through a lightweight join with the synchronized room.
- A tournament-scoped qualification lobby history endpoint returns the removed `attempts` and `standings`.
- The endpoint verifies that the lobby belongs to the requested tournament.
- Existing `OsuMultiplayerHistoryService` remains the source of synchronized games.
- Qualification-specific counted-score and map-standing enrichment runs only in the history request.

## Frontend

- `QualificationLobbyDetailDialog` remains the single dialog used by schedule, statistics, and management pages.
- On mount it requests the selected lobby history through a SvelteKit proxy endpoint.
- The dialog displays loading, error, empty, and populated states using the existing multiplayer history components.
- Closing the dialog aborts an unfinished request.
- The qualification schedule payload no longer includes score attempts or standings.

## Verification

- DTO and service tests prove that lobby lists are lightweight and history enrichment is returned by the detail endpoint.
- The multiplayer history adapter accepts the new history DTO.
- Backend tests, frontend tests, Svelte type checking, and production builds pass.
