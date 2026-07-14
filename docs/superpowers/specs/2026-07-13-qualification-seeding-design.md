# Qualification Seeding Design

## Goal

Let a tournament host import any number of osu! qualification lobbies, calculate seeds from the best map scores, edit seeds, and withdraw solo players, teams, or individual team members with a reason.

## Qualification stage

Stages have a `regular` or `qualification` type. A partial unique database index permits at most one non-deleted qualification stage per tournament. The API returns a clear conflict when a host attempts to create another one.

The qualification stage uses the existing single stage mappool. Its schedule entries represent qualification lobbies rather than head-to-head matches, so they require a name, time, and mp URL but no selected competitors. Regular matches and their result calculation remain unchanged.

## Qualification attempts

The existing osu match client continues to fetch lobby snapshots. For a qualification lobby, synchronization stores every score from each completed game on a map in the qualification mappool:

- tournament match and osu game ID;
- internal beatmap reference;
- internal user reference;
- score.

Raw osu beatmap and user IDs from the lobby are resolved through the existing `beatmaps` and `users` records before persistence. Unknown users, unrelated maps, and unfinished games are ignored. The match, game, and internal user identity make imports idempotent: synchronizing a lobby again updates the stored score instead of adding a duplicate. Any number of qualification lobbies may contribute attempts for the same competitor. osu metadata needed for calculation or diagnosis is joined from the referenced beatmap and user rows rather than duplicated on each attempt.

Attempts are retained in normalized rows so seed calculation is repeatable without another osu API request and the imported source data remains available for database-level diagnosis. A separate attempts UI is outside this feature.

## Registration state

For solo tournaments, the solo registration stores a nullable integer seed, a withdrawal flag, and a nullable withdrawal reason.

For team tournaments, the team stores its nullable integer seed, withdrawal flag, and nullable withdrawal reason. Each team membership separately stores a withdrawal flag and nullable withdrawal reason. Its legacy nullable player seed column is retained for compatibility and data safety but is not exposed or used by the new interface or calculation.

Clearing a withdrawal flag also clears its reason. A withdrawn team member remains part of the historical roster for qualification aggregation: scores imported before or after the withdrawal still contribute while the team itself remains active.

## Seed calculation

The host explicitly starts calculation with `POST /tournaments/:id/qualification/calculate-seeds`. The operation resolves the tournament's sole qualification stage and its current mappool, calculates every active competitor, and writes all seeds in one transaction. It fails without changing seeds when the qualification stage or a non-empty mappool is missing.

For a solo tournament, each competitor's map score is the maximum imported score across all qualification lobbies. A missing map result is zero.

For a team tournament, each completed osu game is one team attempt. The attempt score is the sum of all scores in that game belonging to users registered on the team, including withdrawn members. The team's map score is the maximum attempt sum across all qualification lobbies. Scores from different games are never combined into one team attempt. A missing map result is zero.

Withdrawn solo players and withdrawn teams are excluded from both per-map places and seed assignment. Their seed is cleared during calculation. An active competitor with no attempts participates with zero on every map.

For each mappool map, scores are ranked descending using competition ranking: equal scores share a place and the following place skips accordingly, for example `1, 1, 3`. Average place is the arithmetic mean of the competitor's places across every map in the mappool.

Competitors are ordered by:

1. average place ascending;
2. sum of their best map scores descending;
3. osu user ID ascending for solo tournaments, or stable team ID ascending for team tournaments.

The final order receives unique consecutive seeds `1, 2, 3, ...`. Recalculation replaces every seed, including manual edits.

## Host interface

The stage editor lets the host choose `Regular` or `Qualification`. Once a qualification stage exists, another one cannot be selected or created.

The existing Schedule tab hides competitor selectors for qualification lobbies and otherwise reuses the match form and synchronization controls. The existing Stages and Mappools tabs remain responsible for the stage and its pool.

A new Participants tab in the tournament editor contains:

- for solo tournaments: player, editable seed, withdrawal flag, and reason;
- for team tournaments: team seed, team withdrawal flag and reason, plus member withdrawal flags and reasons;
- a `Calculate seeds` action with confirmation that current manual seeds will be overwritten.

Host-only endpoints update one solo registration, team, or team membership at a time. Public participant presentation is unchanged by this feature.

## Authorization and errors

Creating a qualification stage, importing its lobbies, editing seed or withdrawal state, and calculating seeds require the existing tournament-management permission.

The API rejects a second active qualification stage, qualification calculation without a usable mappool, and updates to registrations outside the tournament. Re-importing a lobby is safe and does not duplicate attempts.

## Verification

The smallest focused checks cover:

- the database invariant allowing only one active qualification stage per tournament;
- idempotent import of completed games and filtering to mappool maps;
- best scores across multiple lobbies and zero for missing maps;
- competition ranking for equal map scores;
- average-place ordering, score-sum tie-break, and stable final tie-break;
- team sums within one game without combining separate attempts;
- inclusion of withdrawn members' scores in an active team;
- exclusion of withdrawn solo players and teams and clearing their seeds;
- authorization and validation for host edits and calculation;
- qualification match forms without competitor selection and participant editing forms.

## Scope

This feature does not add a public qualification leaderboard, an attempts browser, CSV import/export, or configurable ranking formulas. Those can be added when a concrete tournament workflow requires them.
