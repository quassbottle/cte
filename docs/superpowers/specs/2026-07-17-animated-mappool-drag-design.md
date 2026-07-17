# Animated Mappool Drag Design

## Goal

Make mappool reordering feel physical: the full map card follows the pointer, nearby cards move smoothly, and the page scrolls automatically when dragging near the viewport edges.

## Approach

Replace the current native HTML drag handlers with `svelte-dnd-action`. Use `dragHandleZone` on the mappool list and `dragHandle` on the existing grip so forms, inputs, and buttons inside each card remain interactive.

Each local list item receives the stable `id` required by the action, derived from `osuBeatmapId`. The backend DTOs and persisted order remain unchanged.

## Interaction

- `consider` updates the local list while the pointer moves, allowing neighboring keyed cards to make room immediately.
- Each card uses Svelte `animate:flip` so position changes animate instead of jumping.
- The library's dragged element follows the pointer and receives a shadow, slight scale, and rotation through dragged-element styling.
- The library scrolls the window or nearest scrollable parent when the pointer approaches an edge.
- The existing grip is the only drag handle.
- Dragging is disabled while an autosave request is pending.

## Persistence and errors

`finalize` submits the complete ordered beatmap ID list once after drop. The existing SvelteKit action and backend reorder endpoint remain the persistence path.

Before submitting, the component retains the last server-confirmed order. A failed request restores that order and displays the existing error message. A successful request keeps the final order and refreshes page data normally.

## Accessibility

Keep an explicit label on the drag handle and use the library's keyboard drag behavior and ARIA announcements. Do not disable automatic accessibility support.

## Testing

- Unit-test conversion between mappool beatmaps and action items, preserving identity and order.
- Verify `consider` changes only local order and `finalize` produces the ID array used by autosave.
- Run frontend infrastructure tests, `svelte-check`, and production build.

## Acceptance criteria

- The complete card visibly follows mouse, touch, or keyboard dragging from its handle.
- Other cards smoothly move out of the way before drop.
- Dragging near the top or bottom scrolls the page in that direction.
- Exactly one autosave occurs after drop.
- Save failure restores the previously confirmed order.
- Existing map editing controls remain usable.
