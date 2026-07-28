# Regular Match History

## Scope

Add match-history viewing to non-qualification tournament stages. This change
does not add cross-stage statistics yet; it establishes the shared history UI
and data shape that those statistics can use later.

## User experience

- Every regular schedule match with synchronized multiplayer history has an
  explicit `Open` button on desktop and mobile.
- `Open` displays the same modal and score presentation used by qualification
  lobbies.
- Games appear in multiplayer game order and retain the existing beatmap,
  player score, mods, combo, accuracy, statistics, and rank presentation.
- Score rows belonging to the team that won the match are highlighted.
- A tied or unfinished match has no winner highlight.
- MP and VOD links remain independent controls and do not open the dialog.
- A match without synchronized history does not offer an active `Open` action.

## Shared frontend model and components

Extract the qualification-specific shell into one multiplayer history dialog
and one multiplayer history view. Both qualification lobbies and regular
matches provide the same view model:

- title and room metadata;
- sync status and last synchronization time;
- multiplayer URL;
- ordered games with beatmap metadata;
- normalized score rows;
- an optional winning side.

The existing `MultiplayerScore` and player score components remain the only
score renderer. Qualification-specific information such as seats and
qualification standings stays in qualification-owned header/footer content;
regular matches do not fabricate a qualification lobby DTO.

## Backend data flow

The regular match history response is assembled from the existing match,
multiplayer room, game, score, user, and mappool beatmap data.

The API returns normalized frontend-ready fields rather than exposing database
column names. Each score includes its multiplayer team (`red`, `blue`, or
`null`) so the frontend can mark it as highlighted when it matches the winning
side. The winning side is derived from the existing calculated
`redScore`/`blueScore`; match scoring is not reimplemented.

History is loaded only when the dialog is opened. The tournament schedule
payload keeps its current summary data and only needs to indicate whether
history is available.

## Failure and empty states

- A failed history request leaves the schedule usable and shows an error inside
  the dialog.
- A synchronized room with no completed games shows an empty-history message.
- Missing beatmap metadata uses the existing beatmap-ID fallback.
- Closing the dialog discards its request state; reopening retries normally.

## Verification

- Backend test: history preserves game order, maps score fields, and exposes
  the winner derived by the existing match result calculation.
- Frontend test: `Open` toggles the shared dialog and winner rows receive the
  existing score highlight while tied rows do not.
- Regression check: qualification lobby dialogs still render through the same
  shared history components.
- Typecheck and the relevant backend/frontend test suites must pass.
