# Team Match Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculate and display osu results for both solo and team tournament matches.

**Architecture:** Store the two selected teams and aggregate scores directly on `matches`. Score a solo match from its two selected players and a team match from osu's actual red/blue sides. The existing durable scheduler and osu client remain unchanged; only the input, calculator, persistence, API, and editor branch by tournament type.

**Tech Stack:** NestJS, Drizzle/PostgreSQL, Zod, SvelteKit, Jest.

## Global Constraints

- Reuse `teams` and `team_participants`; do not add a team-match join table.
- A team match has exactly two distinct teams from the match tournament.
- Use `legacy_total_score` already normalized by `OsuService`.
- Keep lease fencing and sync lifecycle unchanged.

---

### Task 1: Persist and validate match teams

**Files:**
- Create: `apps/backend/drizzle/0017_team_match_results.sql`
- Modify: `apps/backend/src/lib/infrastructure/db/matches/index.ts`
- Modify: `apps/backend/src/modules/match/dto/index.ts`
- Modify: `apps/backend/src/modules/match/match.service.ts`
- Test: `apps/backend/src/modules/match/dto/schedule-match.dto.spec.ts`

- [ ] Add nullable `red_team_id`, `blue_team_id`, `red_score`, and `blue_score` columns to `matches`, with foreign keys to `teams` and a check preventing equal non-null teams.
- [ ] Add `redTeamId`, `blueTeamId`, `redScore`, and `blueScore` to the Drizzle schema and schedule DTOs.
- [ ] Change schedule-match input to accept either two solo players or two team IDs.
- [ ] Validate that teams are distinct and both belong to the tournament; reject players for team tournaments and teams for solo tournaments.
- [ ] Write and run DTO/service tests for valid team input and invalid duplicate or foreign-tournament teams.

### Task 2: Generalize score calculation and result writes

**Files:**
- Modify: `apps/backend/src/modules/match-sync/types.ts`
- Modify: `apps/backend/src/modules/match-sync/score.ts`
- Modify: `apps/backend/src/modules/match-sync/match-sync.repository.ts`
- Test: `apps/backend/src/modules/match-sync/score.spec.ts`
- Test: `apps/backend/src/modules/match-sync/match-sync.service.spec.ts`

- [ ] Preserve osu's `score.match.team` while normalizing a multiplayer game.
- [ ] Write a failing score test where red and blue osu totals differ on an allowed map, plus tie cases.
- [ ] Calculate solo results from selected users and team results from osu red/blue totals.
- [ ] Load selected teams only to identify a team match; do not depend on current team members during scoring.
- [ ] Persist team scores to `matches`, and retain individual participant score writes only for solo.
- [ ] Run the match-sync unit tests.

### Task 3: Expose and edit team matches

**Files:**
- Modify: `apps/backend/src/modules/match/schedule.service.ts`
- Modify: `apps/frontend/src/lib/api/generated/model/stageScheduleDtoOutputMatchesItem.ts`
- Modify: `apps/frontend/src/lib/api/generated/model/scheduleMatchUpsertDto.ts`
- Modify: `apps/frontend/src/lib/schemas/tournament-edit.schema.ts`
- Modify: `apps/frontend/src/lib/server/services/tournaments/tournament-edit.query.ts`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleMatchForm.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/edit/components/ScheduleTab.svelte`
- Test: `apps/frontend/src/lib/schemas/tournament-edit.schedule.test.ts`

- [ ] Include selected teams and aggregate scores in the schedule response.
- [ ] Load tournament teams for the editor only when `tournament.isTeam` is true.
- [ ] Render red/blue team selectors and score inputs for team tournaments; keep the existing player selectors for solo.
- [ ] Submit `redTeamId` and `blueTeamId` for team matches and existing `players` for solo matches.
- [ ] Disable the appropriate manual score inputs while sync is active.
- [ ] Run frontend schema tests and Svelte type checking.

### Task 4: Verify migration and complete integration

**Files:**
- Modify: generated Drizzle metadata if required by the repository’s migration convention.

- [ ] Run backend unit tests and build.
- [ ] Run frontend tests and type checking.
- [ ] Apply the migration to the local database and create a solo and a team match to verify persisted shape.
- [ ] Review the diff, ensure `.gitignore` is not staged, and commit the implementation.
