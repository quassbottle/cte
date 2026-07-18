# Wiki Match Numbers Design

## Goal

Preserve match identifiers from tournament wikis, including alphanumeric values such as `43c`, while keeping database match IDs as internal CUIDs.

## Design

- Change `matches.match_number` from integer to nullable text. Generate the schema migration with Drizzle Kit; existing numeric values are converted to text without a separate TWC data correction.
- Keep `matches.id` unchanged as the internal CUID.
- In `seed-twc-2026.ts`, store the parsed wiki `match.id` directly in `matchNumber` instead of generating a per-stage sequence.
- Accept trimmed non-empty strings for `matchNumber` in backend and frontend validation, and use a text input in the editor.
- Preserve manual auto-numbering: when creating a match, inspect only match numbers containing positive integers and suggest `max + 1` as a string. Alphanumeric values do not affect the suggestion.
- Keep schedule ordering by start time first. The match number remains the secondary ordering key.

## Verification

- Parser/seed coverage proves an identifier such as `43c` reaches the seeded match unchanged.
- DTO and frontend form tests prove string match numbers are accepted.
- Run focused backend/frontend tests, builds, migration-journal checks, `git diff --check`, and `graphify update .`.

## Out of Scope

- No migration that derives TWC match numbers from existing match names.
- No separate `wikiId` column.
