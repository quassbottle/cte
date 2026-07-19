# Qualification Lobby Score Rows Design

## Goal

Replace each `Beatmap <id>` heading in qualification lobby details with the existing `Beatmap` component and render every synchronized player result as a dedicated score row beneath it.

## Composition

The lobby detail groups attempts by beatmap as it does today. Each group renders:

1. the existing `Beatmap` component populated from the qualification stage's mappool, including the map's tournament mod;
2. one new score-row component per player attempt.

The score-row component owns only presentation of one result. It receives the player's osu! id and name, mods, combo, accuracy, score, hit statistics, and rank. It renders an osu! avatar instead of the country flag, followed by the player identity and a responsive result summary matching the supplied reference. It does not fetch data or render beatmap metadata.

The lobby card remains responsible for grouping and composition. Mappool beatmap data already loaded by the tournament page is passed through the schedule and lobby detail components; no duplicate beatmap request is added.

## Synchronized Score Data

Extend the osu! match snapshot and persisted multiplayer score with:

- player mods;
- maximum combo;
- accuracy;
- rank;
- `great`, `ok`, and `miss` hit counts.

The osu! response parser validates these fields, the sync repository stores them, and the qualification lobby DTO exposes them with each attempt. The database change is generated with the Drizzle Kit CLI. Generated journal and snapshot files are never edited manually.

New score fields remain nullable so previously synchronized rows continue to load. The UI omits unavailable legacy statistics instead of presenting invented zero values. A subsequent room synchronization fills the fields from osu! where available.

## Presentation

The existing `Beatmap` component keeps its current banner, metadata, links, copy actions, and tournament mod badge. The new score row visually follows the reference:

- circular player avatar and player name;
- individual mod badges;
- combo and accuracy;
- prominent formatted score;
- great, ok, and miss counts;
- rank badge.

On narrow screens the same information wraps into a compact readable layout without horizontal scrolling. Avatar images use the stable osu! avatar URL derived from `osuUserId` and include useful alternative text.

## Verification

- Osu service test proves match score details are parsed into the snapshot.
- Multiplayer sync repository test proves the new values are persisted.
- Qualification lobby repository/service test proves the values reach the DTO.
- A focused frontend test covers score-row display data or markup using the project's existing test style.
- Run relevant frontend and backend tests, typechecks, build, `git diff --check`, and `graphify update .`.

## Out of Scope

- Reimplementing the existing `Beatmap` component.
- Fetching beatmap or score data when opening the modal.
- Reproducing osu!'s game header, timing, or team presentation outside the requested beatmap and score composition.
