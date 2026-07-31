# Match History Score Ordering Design

## Goal

Order each synchronized match game by its actual map result and highlight every
map winner.

## Result rules

- Solo matches sort players by score descending.
- Every solo player tied for the highest score is highlighted.
- Team matches sum player scores for each osu! multiplayer team.
- The team with the higher total is shown first.
- Players within each team are sorted by score descending.
- Every player on a team tied for the highest total is highlighted.
- Highlighted red-team players use red styling; highlighted blue-team players
  use blue styling. Solo winners keep the existing primary styling.
- Game order and the overall match winner remain unchanged.

## Implementation

`MatchHistoryService` derives ordering and per-game highlighting while mapping
room history into the API response. The existing `team` field is passed through
to the shared score card, which selects the highlight color without duplicating
winner calculations in the frontend.

## Verification

- Backend service tests cover solo ordering, team grouping, within-team
  ordering, and tied winners.
- Frontend component checks cover red, blue, and solo highlight classes.
