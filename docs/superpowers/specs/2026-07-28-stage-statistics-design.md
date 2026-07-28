# Stage Statistics

## Goal

Replace the qualification-only tournament tab with a Statistics tab that shows per-map results for every tournament stage.

## Navigation and Loading

- Rename the top-level `Qualification` tab to `Statistics`.
- Inside Statistics, render the tournament stages with the existing `TabGroup`.
- Store the selected stage and sorting in the URL.
- Load statistics only for the selected stage.
- Keep map sorting on the backend.

## Shared Response

The selected stage statistics response contains:

- stage identity and type;
- the stage mappool maps in mappool order;
- every active tournament competitor;
- an optional qualification seed;
- every result attempt grouped by competitor and map.

Each attempt contains its score, place among all attempts on that map, game ID, and match ID when the attempt came from a regular match.

## Qualification Stage

- Preserve existing qualification seeds and counted team/player map scores.
- Default sorting is ascending by seed.
- Qualification attempts have no match ID.

## Other Stages

- One attempt is the sum of the competitor's player scores in one synchronized multiplayer game.
- Keep every attempt. A competitor that played the same map in multiple matches appears multiple times in that map's ranking.
- Places are calculated across attempts, not unique competitors.
- A table cell lists all attempts for that competitor and map as `score · #place`.
- Default sorting is ascending by competitor name.

## Sorting

- Clicking a map sorts competitors by their best attempt on that map.
- The first map click uses descending order; subsequent clicks toggle descending and ascending.
- A missing result has value zero for sorting.
- Qualification seed sorting remains toggleable.

## Frontend

- Reuse one statistics table for qualification and regular stages.
- Show seed only when the selected stage is qualification.
- Keep compact beatmap headers with cover, mod/index, title, and difficulty.
- Preserve the existing horizontal overflow behavior.

## Verification

- Repository tests cover multiple attempts by one competitor and attempt-level places.
- Service/DTO tests cover qualification seeds and regular-stage responses.
- Frontend sorting URL tests cover stage changes and direction toggling.
- Backend tests, frontend tests, type checking, and production builds pass.
