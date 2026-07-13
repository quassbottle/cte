# Team Match Sync Design

## Goal

Make osu match synchronisation calculate results for both solo and team tournaments.

## Match competitors

`matches` gains nullable `red_team_id` and `blue_team_id` foreign keys to `teams`.

- A solo match has both fields `NULL` and exactly two selected players.
- A team match has two different teams from the same tournament, selected as red and blue.
- Team members are read from the existing `team_participants` table. The match does not copy a roster.
- A team match cannot be saved with manual player selection; a solo match cannot be saved with team selection.

## Result calculation

The sync repository loads two competitors:

- solo: one player per competitor;
- team: osu IDs of the members of the selected red and blue teams.

For each completed osu game whose beatmap belongs to the stage mappool, the calculator sums `legacy_total_score` for each competitor's members. A higher sum grants one point; a tie or a game without a score from every member is ignored. Games outside the mappool are ignored.

The scheduler, durable leases, retry policy, osu client, and mp-link lifecycle remain unchanged.

## Persistence and display

`match_participants` remains the source of individual match participants for solo tournaments. Team matches store their two aggregate results on `matches` as `red_score` and `blue_score`; the winning side is derived from those values. The schedule response exposes the two selected teams and their scores, and the editor displays team selectors instead of player selectors for team tournaments.

Manual editing follows the same shape: solo edits two player scores; team edits red and blue scores. Active sync locks either form.

## Validation and tests

Backend validation enforces that selected teams are distinct and belong to the match tournament. The sync input rejects a team match with an empty team roster. Tests cover solo calculation, red/blue aggregation, ties, incomplete team scores, maps outside the stage mappool, and team selection validation.
