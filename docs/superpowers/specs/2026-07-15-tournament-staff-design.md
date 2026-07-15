# Tournament Staff Design

## Goal

Show and manage the staff assigned to each tournament, with a player allowed
to hold several staff roles in the same tournament.

## Data model

- `staff_roles` is a global role catalog. The migration seeds `Host`,
  `Referee`, `Mapper`, `Commentator`, `Streamer`, and `Playtester`.
- `tournament_staff_members` associates a tournament, a role, and a user.
  A unique `(tournament_id, role_id, user_id)` constraint prevents duplicate
  assignments while allowing one user to be assigned to several roles.
- Roles are global rather than duplicated for every tournament. This leaves a
  direct path to add further shared roles later without changing assignments.

## API and authorization

- A public tournament endpoint returns all global roles with their assigned
  users for that tournament, including roles that currently have no members.
- Tournament editors can add a user to a role and remove an assignment.
- The existing tournament update policy protects these write endpoints.
- Requests validate IDs and reject duplicate assignments through the database
  constraint; removing a missing assignment returns the existing scoped
  not-found behavior.

## UI

- Add `Staff` to the public tournament tabs.
- Render each role as a group titled with the role name and its members as the
  existing player cards. Extract the existing team/group player rendering only
  as far as needed so the participant and staff tabs share it.
- Add `Staff` to the tournament edit tabs. The editor assigns a searched user
  to a selected role and removes existing assignments. Role administration is
  explicitly out of scope.

## Seed and verification

- Extend the local tournament seed script to add staff assignments for the
  seeded users.
- Cover the role and assignment DTOs plus service behavior for listing,
  adding, removing, and duplicate prevention. Verify frontend type generation
  and the affected backend/frontend test commands.

## Scope boundaries

- No role creation, rename, deletion, or per-tournament role catalog UI.
- No changes to tournament participant registration or team membership.
