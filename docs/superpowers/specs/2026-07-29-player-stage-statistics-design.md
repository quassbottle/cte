# Player Stage Statistics

## Goal

Allow users of team tournaments to switch stage statistics between team results and individual results for players who actually played.

## API

Extend the existing stage statistics query with `view=teams|players`. Team view remains the default for team tournaments. Solo tournaments always return player statistics and do not render the switch.

The existing response shape remains shared. Player competitors additionally include their team name. No match histories are loaded to build the table.

## Backend

`StageStatisticsService` selects the aggregation from the requested view:

- team view keeps the existing team totals and qualification seeds;
- player view reads individual multiplayer scores for the selected stage;
- only users with at least one score are returned;
- qualification scores are linked through qualification lobbies;
- other stage scores are linked through scheduled matches;
- each player attempt is returned separately;
- attempt place is ranked against all individual attempts on the same map;
- player sorting is performed in SQL by username or by the player's best score on the selected map.

Player rows contain the osu! username and current tournament team name.

## Frontend

Team tournaments render a `Teams / Players` switch above the statistics table. The selected value is stored in the URL as `view=players`; stage and sort links preserve it.

The existing statistics table renders both views. Player rows show the username and team. Map cells continue to show every attempt with score, place, and match-history link.

Solo tournaments do not render the switch.

## Verification

- backend tests cover player attempts, places, team names, qualification data, and both sort directions;
- frontend tests cover query parsing and preservation of `view`;
- backend and frontend typechecks pass.
