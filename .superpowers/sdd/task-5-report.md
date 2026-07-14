# Task 5 report: host qualification roster management

## Status

Complete on `feat/seed` from base `916d751`.

## Implementation

- Added discriminated solo/team management roster schemas and narrow edit DTOs; team-member edits reject seed changes.
- Added solo/team roster reads with withdrawal state and API avatar URLs without changing public participant DTOs.
- Added tournament-scoped solo, team, and team-member updates. Setting `withdrawn` to false clears `withdrawalReason` centrally, and missing scoped rows return `TOURNAMENT_NOT_FOUND`.
- Added one-transaction qualification recalculation: validates the stage and non-empty pool, loads normalized attempts, clears all relevant seeds, and writes only active competitor results one row at a time.
- Team recalculation filters withdrawn teams but intentionally includes every team member's attempts regardless of member withdrawal.
- Secured management GET and nested POST/PATCH routes by resolving the existing tournament creator; archived tournaments are denied and only collection POST uses create context.
- Added the five host-only controller routes. Every edit and calculation returns the management roster.
- Added the missing minimal `TeamIdPipe`, matching the existing ID-pipe pattern, because the brief required runtime team ID validation but the repository had no implementation.

## RED/GREEN evidence

- DTO RED: `pnpm test -- dto/index.spec.ts --runInBand` failed with missing `qualificationRosterDtoSchema` and `updateQualificationCompetitorDtoSchema` exports.
- DTO GREEN: the focused DTO suite passed 4/4, then 5/5 after a second RED for the team-member schema (`updateQualificationTeamParticipantDtoSchema` missing).
- Scoped-update RED: `pnpm test -- tournament.service.spec.ts --runInBand` failed because the four roster/update service methods were absent.
- Scoped-update GREEN: the service suite passed 10/10 with tournament/team/user predicate assertions and withdrawal-reason clearing.
- Recalculation RED: the service suite failed because `calculateQualificationSeeds` was absent.
- Recalculation GREEN: the service suite passed 13/13, then 15/15 with explicit no-member-withdrawal-filter and scoped-not-found coverage.
- Policy RED: the resolver suite failed because management GET was unsupported and nested POST incorrectly returned create context.
- Policy GREEN: the resolver suite passed 4/4, including archived denial.

## Verification

- Final focused API tests: `pnpm test -- tournament.service.spec.ts dto/index.spec.ts tournament-policy-context.resolver.spec.ts --runInBand` passed 3/3 suites and 24/24 tests.
- Final full backend: `pnpm test -- --runInBand` passed 19/19 suites and 73/73 tests.
- Final build: `pnpm run build` exited 0.
- `git diff --check` exited 0.

## Concerns

None. The pre-existing dirty `modules/match-sync/score.ts`, migrations, frontend, and unrelated planning artifacts were not modified or staged by this task.
