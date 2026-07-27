# Multiplayer Score Details Design

## Goal

Show synchronized osu! mods, maximum combo, accuracy, and rank beside each multiplayer score, matching the supplied layout and rank colors.

## Score Details

`PlayerMultiplayerScore` reads all score details directly from the qualification lobby API:

- render every entry from `mods` with the existing `Mod` component;
- render `maxCombo` as a formatted combo value;
- render `accuracy` as a percentage with two decimal places;
- render `rank` with the new shared `Rank` component.

The four score details are required at the score-row boundary. A `null` value throws a descriptive frontend error naming the player and missing field instead of silently rendering an incomplete row. Hit statistics remain nullable because they are supplementary and were not part of the requested contract.

The lobby detail dialog stores the selected lobby id, not a stale lobby object. After polling or form invalidation refreshes the `lobbies` prop, the open dialog resolves that id against the fresh array so newly synchronized details appear without closing and reopening it.

## Rank Component

Add `apps/frontend/src/lib/components/rank/rank.svelte` following the existing `mod.svelte` pattern. It accepts a `rank` string and optional CSS class, normalizes the API value, and owns both its displayed label and visual variant.

Supported API values are `XH`, `X`, `SH`, `S`, `A`, `B`, `C`, `D`, and `F`. `XH` and `X` display as `SS`; `SH` and `S` display as `S`. Hidden variants use silver lettering while their non-hidden equivalents use gold lettering. Each rank family has its own pill color. Unknown values remain visible with a neutral fallback instead of breaking the row.

`PlayerMultiplayerScore` replaces its inline rank markup with the shared `Rank` component. The component receives the existing `rank` value already supplied by the qualification lobby API; no backend or API changes are needed.

## Verification

Focused tests cover required score details, score and accuracy formatting, fresh selected-lobby resolution, API-value rank normalization, and hidden/non-hidden rank variants. Frontend tests and type checking must pass, followed by `git diff --check` and `graphify update .`.

## Out of Scope

- Recreating osu!'s animated rank artwork.
- Adding another rank mapping or styling dependency.
- Changing synchronized score data, API contracts, or rank calculation.
