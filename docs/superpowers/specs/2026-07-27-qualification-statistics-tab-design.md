# Qualification Statistics Tab Design

## Goal

Make qualification statistics part of the tournament page, support server-side
two-way sorting, show qualification seeds, and reuse the existing lobby detail
dialog for match history.

## Page structure

- Qualification statistics are a real tab on `/events/[slug]`, not a separate
  page with its own shell.
- The standalone `/events/[slug]/qualification` route is removed.
- The tab is shown only when the tournament has a qualification stage.
- The existing tournament page load supplies statistics, qualification
  lobbies, and mappool beatmaps to the tab.

## Matrix

- Rows represent teams for team tournaments and players for solo tournaments.
- The sticky first column displays the persisted qualification seed and
  competitor name.
- A compact icon-only button beside the competitor name resolves the assigned
  qualification lobby and opens the existing
  `QualificationLobbyDetailDialog`. It follows the small MP action-button
  styling but opens the dialog instead of navigating to an external URL. It
  has an accessible label describing the action.
- The dialog remains the single implementation of qualification match history.
- Map columns preserve mappool order when no map sort is active.
- The matrix container scrolls horizontally when all columns do not fit.

## Map headers

Each map column uses a compact header made specifically for the matrix. It is
not the existing full beatmap component.

The header shows:

- a small cover background;
- mod and index, such as `NM1`;
- beatmap title;
- difficulty name.

The text remains readable over the cover through a compact overlay. Header
width stays bounded so a large pool remains usable through horizontal
scrolling.

## Server-side sorting

`GET /api/tournaments/:id/qualification-results` accepts optional:

- `sortBeatmapId`;
- `sortDirection` with `asc` or `desc`.

The backend remains the sole owner of ordering:

- without `sortBeatmapId`, competitors use their persisted qualification seed;
  the initial direction is `asc`, and clicking the competitor header toggles
  `asc ↔ desc`;
- with a map selected, competitors use the backend-provided map score;
- a newly selected map starts in `desc`; repeated clicks toggle
  `desc → asc → desc`;
- a missing result remains displayed as `—`, but participates in sorting as a
  score of `0`;
- persisted seed is the deterministic tie-breaker;
- `sortDirection` reverses the complete score order, including missing
  results.

The frontend stores sorting in page query parameters. Clicking a map header
navigates with `sortBeatmapId`; clicking the active header toggles
`sortDirection`. Server load calls the endpoint with those parameters. No
frontend standings or sorting helper remains.

## Data contract

Map metadata adds the compact cover URL required by the header. Competitor
statistics keep persisted `seed` and per-map score/place/game data. Lobby
details are not duplicated in the statistics DTO; the tab reuses the
qualification lobbies already loaded for the tournament page.

## Verification

- Backend tests cover default seed order, ascending map score order, descending
  map score order, seed tie-breaking, and missing results sorting as zero.
- Frontend checks cover query-parameter toggling and rendering through
  Svelte/TypeScript checks.
- Backend and frontend production builds must pass.
- Generated OpenAPI output must be refreshed from the live backend and remain
  reproducible.
