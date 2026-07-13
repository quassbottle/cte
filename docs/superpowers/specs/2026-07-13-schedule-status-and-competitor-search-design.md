# Schedule Status and Competitor Search

## Scope

- Show a status badge on every schedule match in desktop and mobile layouts.
- Replace native player and team selects in the schedule editor with an accessible searchable combobox.
- Search tournament players and teams on the backend with a 250 ms frontend debounce and cancellation of stale requests.
- Remove HTTP-method branching from `MappoolPolicyContextResolver`.

## Match Status

The schedule API already exposes `syncStatus`. The frontend maps it without adding another backend state:

- `active` renders `LIVE`.
- `stopped` and `completed` render `FINISHED`.
- `null` renders `UNKNOWN`.

`MatchView` carries this display state. One shared status badge component is rendered by both the desktop table row and mobile match card. Scheduled end time does not determine status because it is not proof that the osu match finished.

## Competitor Search API

Solo participant search extends the tournament participant query with an optional trimmed search string. The query filters only registered participants of the requested tournament by case-insensitive osu username, and supports exact osu ID when the search is numeric. It returns the existing participant DTO and a small bounded page.

Team search uses a dedicated tournament-scoped endpoint returning team summaries (`id`, `name`). It filters only teams belonging to the requested tournament by case-insensitive name and returns a small bounded page. The existing full team endpoint remains unchanged for tournament pages.

Backend match validation remains authoritative: solo player IDs must belong to `solo_participants`, and selected team IDs must belong to the tournament.

## Frontend Combobox

The editor no longer preloads up to 100 participants. A SvelteKit server endpoint accepts the tournament ID, competitor kind, and query, calls the corresponding backend search, and returns normalized options:

```ts
type CompetitorOption =
  | { type: 'player'; id: string; label: string; avatarUrl: string }
  | { type: 'team'; id: string; label: string };
```

`ScheduleCompetitorPicker` uses the installed Bits UI combobox for keyboard navigation, focus, and selection semantics. Opening it loads initial results. Typing waits 250 ms, aborts the previous request, and requests new backend results. Player rows show avatar and username; team rows show a team icon and name. Empty, loading, and request-error states appear inside the dropdown. Selected values remain in hidden form inputs so existing form parsing and actions do not change.

Player 1/Player 2 and Red team/Blue team use this component. Staff fields keep the current global lookup because staff are not tournament competitors.

## Policy Resolver

`MappoolPolicyContextResolver` resolves the tournament by available validated input, not HTTP method:

1. `params.tournamentId` for tournament-scoped management routes.
2. `params.id` for existing mappool routes.
3. `body.stageId` for mappool creation.

The existing route support predicate still limits which requests reach the resolver. Archived and missing tournament behavior stays centralized in the resolver.

## Verification

- Unit-test all `syncStatus` badge mappings.
- Test solo participant search scope and matching.
- Test team search scope and matching.
- Test resolver source precedence without a GET-specific branch.
- Test debounced option loading separately from the visual component where practical.
- Run backend tests/build, frontend tests/check/build, and `git diff --check`.
