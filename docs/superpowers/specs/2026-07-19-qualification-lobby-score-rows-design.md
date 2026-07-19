# Qualification Lobby Score Rows Design

## Goal

Replace each `Beatmap <id>` heading in qualification lobby details with the existing `Beatmap` component and render every synchronized player result as a dedicated score row beneath it.

## Composition

The lobby detail groups attempts by beatmap as it does today. Each group renders:

1. the existing `Beatmap` component populated from the qualification stage's mappool, including the map's tournament mod;
2. one reusable `BeatmapScore` component per player attempt.

`BeatmapScore` belongs to the shared component library, not the qualification domain. It owns presentation of one player's result on a beatmap and defines a generic props type containing the player's osu! id and name, mods, combo, accuracy, score, hit statistics, and rank. It renders an osu! avatar instead of the country flag, followed by the player identity and a responsive result summary matching the supplied reference. It neither imports qualification DTOs nor fetches data or renders beatmap metadata, so match and multiplayer views can reuse it later.

The lobby card remains responsible for adapting its attempt DTO to `BeatmapScore` props, grouping attempts, and composing score rows with beatmaps. Mappool beatmap data already loaded by the tournament page is passed through the schedule and lobby detail components; no duplicate beatmap request is added.

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

The existing `Beatmap` component keeps its current banner, metadata, links, copy actions, and tournament mod badge. The shared `BeatmapScore` row visually follows the reference:

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
- A focused frontend test covers generic `BeatmapScore` formatting without qualification-domain imports.
- Run relevant frontend and backend tests, typechecks, build, `git diff --check`, and `graphify update .`.

## Out of Scope

- Reimplementing the existing `Beatmap` component.
- Fetching beatmap or score data when opening the modal.
- Reproducing osu!'s game header, timing, or team presentation outside the requested beatmap and score composition.
