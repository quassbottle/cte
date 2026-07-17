# Mappool Beatmap Reordering Design

## Goal

Allow a tournament host or administrator to drag any beatmap to any position in a mappool and save the new global order automatically without changing the beatmap's mod or mod-specific index.

## Data model

Add a positive integer `position` to `mappools_beatmaps`. The existing `index` remains the slot number within a mod, such as `NM2` or `HD1`; `position` controls only the visual order across all mods.

Generate the schema migration with Drizzle Kit. Backfill existing rows deterministically in their current display order. New beatmaps receive a position after the current maximum. Deleting a beatmap may leave a gap because ordering only depends on relative position.

All management and public mappool reads order beatmaps by `position`.

## API and persistence

Add a reorder endpoint under the existing mappool routes. Its body contains the complete ordered array of osu beatmap IDs for one mappool.

The backend verifies that the array:

- contains every current beatmap exactly once;
- contains no duplicate IDs;
- contains no beatmap outside the mappool.

It then writes contiguous positions in one database transaction. Invalid or stale arrays are rejected without changing any positions. Qualification results are invalidated after a successful reorder, following existing mappool mutation behavior.

The endpoint uses the existing mappool management authorization policy, so tournament hosts and administrators may reorder maps; ordinary users may not.

## Management UI

The edit mappool list shows a drag handle on every beatmap row. Native HTML drag-and-drop is sufficient; no new frontend dependency is needed.

On drop, the list updates optimistically and submits the complete ordered ID array. Further dragging is disabled while the request is pending. On success, the optimistic order remains. On failure, the previous order is restored and an error is shown. If the server rejects a stale list, the page data is invalidated so the current server order is loaded.

The existing mod and index editing controls remain unchanged. Reordering never rewrites values such as `NM1`, `NM2`, or `HD1`.

Keyboard reordering is outside this iteration; existing form controls remain keyboard accessible.

## Testing

Backend tests cover successful atomic reordering, duplicate IDs, missing IDs, foreign IDs, stale input, and authorization for host, administrator, and ordinary user. Read tests verify `position` ordering and add tests verify append-at-end behavior.

Frontend tests cover deriving the reordered ID list and restoring the previous order after a failed autosave. Existing mappool editing and display tests must continue to pass.

## Acceptance criteria

- A host or administrator can drag any map across maps of any mod.
- Dropping immediately saves the new order without a separate button.
- Reloading both management and public pages preserves the order.
- A failed save leaves the database unchanged and restores or reloads the UI order.
- Reordering does not change a map's mod or mod-specific index.
- An ordinary user cannot call the reorder endpoint.
