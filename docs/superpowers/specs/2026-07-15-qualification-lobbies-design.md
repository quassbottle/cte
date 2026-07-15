# Qualification Lobbies and osu Multiplayer Sync Design

## Goal

Replace qualification-stage schedule matches with dedicated qualification
lobbies and make osu multiplayer synchronization independent from both regular
matches and qualification lobbies.

The production database is currently empty and may be recreated. The change
therefore uses a clean schema migration without a compatibility layer or legacy
qualification-match backfill.

## Architectural boundaries

### OsuMultiplayerSyncModule

This infrastructure module owns the external osu multiplayer representation:

- room synchronization state, leases, retries, and polling timestamps;
- the osu API client and multiplayer URL parsing;
- normalized games and every score returned by osu;
- `sync(roomId)`, which atomically upserts a snapshot and reports whether the
  stored games or scores changed.

It does not import tournament, match, or qualification modules and does not
store an owner type. A multiplayer room is an independent external resource.

### MatchModule

Regular matches retain their schedule, competitors, referee, stream, and VOD
data. A match may reference one osu multiplayer room. Its result is calculated
from normalized room games and scores when the schedule is read. Match results
have no manual score input or override; without synchronized room data they are
pending.

The regular-match scheduler selects active rooms referenced by matches and
invokes the common room sync service. It contains orchestration only; fetching,
locking, retrying, and raw persistence remain in `OsuMultiplayerSyncModule`.

### QualificationModule

This feature module owns:

- qualification lobbies and their participant assignments;
- lobby management and player/captain selection rules;
- qualification sync orchestration;
- qualification aggregation and materialized results;
- qualification seed queries.

It does not call `MatchSyncService`, and qualification-specific calculations no
longer live in `TournamentService`.

The qualification scheduler groups active lobby rooms by stage, invokes the
common room sync service for them, and rebuilds that stage's materialized
results at most once per polling cycle when they are missing or older than the
latest changed room data.

### TournamentModule and MappoolModule

These modules continue to own tournaments, registration, staff, stages, and
mappools. Changes that affect qualification calculation invalidate the relevant
materialized results through the narrow
`QualificationResultsService.invalidate(stageId)` application API. The
dependency is one-way: qualification reads their persisted inputs but does not
import their services.

## Data model

### Raw osu multiplayer data

`osu_multiplayer_rooms` stores:

- internal room ID and unique osu match ID;
- `active`, `stopped`, or `completed` status;
- next sync, lease, retry, last sync, last data change, and last error fields.

`osu_multiplayer_games` stores one row per `(room_id, osu_game_id)`, including
the osu beatmap ID and completion time.

`osu_multiplayer_scores` stores one row per
`(room_id, osu_game_id, osu_user_id)`, including the raw score and osu team.
External user and beatmap IDs are retained even when they do not yet map to an
application user or beatmap, so synchronization never silently discards source
data.

Both `matches` and `qualification_lobbies` reference a room by nullable unique
foreign key. Multiplayer URLs and sync state are not duplicated in the domain
tables.

### Qualification lobbies

`qualification_lobbies` belongs to a qualification stage and stores its number,
start/end time, referee, and optional room reference.

Solo and team assignments remain separate tables to preserve foreign keys to
users and teams. Their denormalized `stage_id` is protected by a composite
foreign key to `(lobby_id, stage_id)`. Unique indexes allow one assignment per
competitor per qualification stage.

Capacity is 16 player seats. A team consumes the number of its active members.
Selection locks the target lobby row before counting and moving assignments, so
concurrent requests cannot exceed capacity.

### Materialized qualification results

`qualification_results` contains one final aggregate per active competitor:

- stage ID;
- exactly one of user ID or team ID;
- aggregate score and seed;
- calculation timestamp.

The table is replaced for one stage in a transaction. It is stale when it is
empty or its calculation timestamp precedes the greatest
`last_data_changed_at` among that stage's lobby rooms. If recalculation fails,
the previous rows remain stale and the next scheduler pass retries.

Changing a mappool, lobby assignment, or active competitor set deletes the
affected stage's materialized rows. The next qualification polling pass rebuilds
them once all active competitors have lobby assignments.

Raw lobby attempts shown in the UI come directly from normalized scores and are
not duplicated in a qualification-attempt table.

## Authorization and invariants

- Lobby reads are public.
- Only the tournament host/editor manages lobbies and starts or stops their
  synchronization.
- A solo participant may select only themself.
- Only a team's captain may select or move the complete active team.
- Commentator and Streamer staff may participate; other staff roles may not.
- Every mutation scopes the lobby and room through the tournament route ID.
- A lobby has exactly one tournament referee.
- Qualification results are materialized only when every active competitor has
  a lobby assignment.
- Qualification stages reject regular match creation; ordinary stages reject
  qualification lobby creation.

## Data flow and failure handling

Room synchronization obtains a lease, fetches one osu snapshot, and writes
games, scores, and sync state in one transaction. Upserts are idempotent. API or
database failures release or expire the lease and use the existing bounded
backoff policy. A closed osu room becomes completed.

Domain result calculation happens outside the raw ingestion transaction. Match
reads calculate their current result from raw data. Qualification materializing
replaces cached rows only after a complete successful calculation, so readers
never observe a partially rebuilt table.

## API and UI

Qualification endpoints and DTOs are generated into the frontend OpenAPI
client; the frontend does not maintain handwritten copies of backend payloads.

Qualification stages have a separate lobby view. Cards display lobby number,
time, referee, participants, room link, sync state, capacity, and raw attempts
grouped by beatmap. Logged-in solo players and team captains can select or move
their own competitor. Host-only editor forms manage lobby details and sync.

Regular schedule views exclude qualification stages and no longer expose manual
score fields for synchronized matches. Both views reuse the existing polling
cadence while any referenced room is active.

## Verification

Tests cover:

- idempotent raw snapshot persistence and retention of unknown osu IDs;
- lease exclusion, retry, and changed-data detection;
- regular match aggregation from raw scores;
- one qualification rebuild per dirty stage and atomic replacement;
- invalidation after relevant input changes;
- lobby capacity under concurrent selection;
- self-only solo and captain-only team selection;
- tournament scoping and public lobby reads;
- lobby card contents, selection state, and active polling;
- generated API consistency, backend build/tests, frontend infrastructure tests,
  Svelte check, and production builds.

## Deliberate limits

There is no universal scheduled-event domain model, projection registry,
polymorphic owner field, event bus, compatibility layer, or immutable published
qualification snapshot. Add a frozen result snapshot only when bracket creation
requires results that must no longer follow newly synchronized scores.
