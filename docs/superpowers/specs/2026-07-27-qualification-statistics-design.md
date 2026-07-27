# Qualification Statistics Design

## Goal

Add a public tournament page at `/events/[slug]/qualification` where all qualification competitors can be compared across every qualification map.

## Backend

Expose a read-only tournament qualification statistics endpoint. Reuse `calculateQualificationSeeds` as the only source of map scores and places.

The response contains:

- qualification maps in mappool order;
- competitors in current qualification seed order;
- for every competitor and map: `score`, `place`, and the counted osu! game ID.

Withdrawn competitors stay excluded by the existing qualification calculation. A missing map result is returned without a counted game and displayed as `—`.

## Frontend

Render a matrix:

- rows are teams for team tournaments and players for solo tournaments;
- columns are qualification maps;
- each populated cell displays `score · #place`;
- the competitor column remains sticky while the table scrolls horizontally;
- selecting a map header sorts rows by that map's place;
- the initial order follows the current qualification seed.

The page is linked from the tournament navigation only when the tournament has a qualification stage.

## Validation

- Backend tests verify map order, competitor order, score, place, and missing results.
- Frontend tests verify matrix mapping and per-map sorting.
- Backend build, Svelte check, and frontend production build must pass.

## Out of Scope

- Editing seeds or qualification results.
- Recalculating qualification standings in the browser.
- Charts, exports, filters, or pagination.
