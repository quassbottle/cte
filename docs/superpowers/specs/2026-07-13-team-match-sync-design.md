# Team Match Sync Design

## Goal

Make osu match synchronisation calculate results for both solo and team tournaments.

## Match competitors

`matches` gains nullable `red_team_id` and `blue_team_id` foreign keys to `teams`.

- A solo match has both fields `NULL` and exactly two selected players.
- A team match has two different teams from the same tournament, selected as red and blue.
- `team_participants` is used to list and validate tournament teams. The match does not copy a roster.
- A team match cannot be saved with manual player selection; a solo match cannot be saved with team selection.

## Result calculation

For a solo match, the calculator compares the two selected players. For a team match, it sums `legacy_total_score` by the actual osu game side, `score.match.team` (`red` or `blue`). A higher sum grants one point; a tie is ignored. This makes historic results independent of later changes to a tournament team roster. Completed games outside the stage mappool are ignored.

The scheduler, durable leases, retry policy, osu client, and mp-link lifecycle remain unchanged.

## Persistence and display

`match_participants` remains the source of individual match participants for solo tournaments. Team matches store their two aggregate results on `matches` as `red_score` and `blue_score`; the winning side is derived from those values. The schedule response exposes the two selected teams and their scores, and the editor displays team selectors instead of player selectors for team tournaments.

Manual editing follows the same shape: solo edits two player scores; team edits red and blue scores. Active sync locks either form.

## Validation and tests

Backend validation enforces that selected teams are distinct and belong to the match tournament. The sync input rejects a team match with an empty team roster. Tests cover solo calculation, red/blue aggregation, ties, incomplete team scores, maps outside the stage mappool, and team selection validation.
