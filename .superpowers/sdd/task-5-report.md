# Task 5 report

## RED

- Backend qualification tests failed because `start` and `stop` did not exist.
- Frontend infrastructure test failed because the tournament editor mock lacked `qualificationLobbies`.
- `svelte-check` failed on the duplicate `actions` slot, stale handwritten lobby type, and stale generated fields.
- The public solo action accepted a browser-supplied `userId`.

## GREEN

- Qualification lobby reads now include referee/player/team names, capacity, room status, last sync time, and raw score attempts grouped by beatmap in the UI. Unknown osu! users remain visible by numeric ID.
- Replaced the legacy `/sync` operation with host-only `/start` and `/stop`; active rooms poll every 10 seconds.
- Public solo selection sends only `lobbyId`; team captains send `teamId`. Full lobbies still allow an existing occupant to reselect/move.
- Editor manages lobby number, referee, times, room URL, delete, start, and stop.
- Removed handwritten lobby types, raw lobby fetches, manual match-score form/schema fields, qualification stages from ordinary schedule tabs, and stale seed recalculation UI/client code.
- Refreshed OpenAPI and generated frontend models/endpoints.

## Verification

- Backend focused tests: 3 suites, 10 tests passed.
- Frontend lobby/schema tests: 7 passed.
- Solo identity regression test: 1 passed.
- Frontend infrastructure tests: 28 passed.
- `svelte-check`: 0 errors, 0 warnings.
- Frontend production build: passed.
- Backend build: passed.
- API consistency check: passed after staging generated artifacts.

## Files

- Backend: qualification DTO/controller/service/module and shared room claim behavior.
- Frontend: generated API artifacts, backend client/services, public/editor route actions and tabs, lobby card/view helpers, schedule forms/schemas.

## Cleanup

- No compatibility `/sync` endpoint or local `QualificationLobby` type remains.
- No manual score input names remain in frontend source.
- Derived match result score fields remain read-only display output.

## Review follow-up

- Forced starts now persist `active` inside the lease transaction, so a failed fetch remains scheduler-retryable; PostgreSQL regression coverage verifies the failure/backoff/reclaim flow.
- Tournament staff reads and mutations now use generated endpoints and DTOs end-to-end; the handwritten staff type was deleted.
- Lobby editor controls have explicit accessible labels and IDs.
- Public selection uses the card's single actions slot.
- Removed unreachable qualification-lobby wording from the regular schedule editor.
