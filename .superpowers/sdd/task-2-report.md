# Task 2 report: qualification stage and lobby shape

## Status

Complete on `feat/seed`. Qualification is exposed by stage DTOs, limited to one active stage per tournament, and enforced as an mp-backed lobby without selected players or teams on both scheduled-match create and update.

## TDD evidence

### Stage RED

`pnpm test -- stage.service.spec.ts --runInBand` exited 1 before production changes. TypeScript reported that `createStageDtoSchema` had no `type` property and `StageExceptionCode.STAGE_QUALIFICATION_EXISTS` did not exist.

The update cycle was separately proven RED: the same command exited 1 because `updateStageDtoSchema` and `StageUpdateParams` did not accept `type`.

### Stage GREEN

`pnpm test -- stage.service.spec.ts --runInBand` exited 0 with 7/7 tests passing. Coverage includes create default/qualification parsing, update parsing, active-stage conflict, exact unique-constraint translation, unrelated `23505` passthrough, and update conflict.

### Match RED

`pnpm test -- match.service.spec.ts --runInBand` exited 1 with four expected failures: the schedule DTO stripped `type`, missing mp URL reached the transaction, and selected solo/team competitors reached regular database validation.

The update path was separately proven RED by withholding the stage from the shared validator: 6/7 tests passed and update reached the transaction instead of throwing the qualification competitor error.

### Match GREEN

`pnpm test -- stage.service.spec.ts match.service.spec.ts --runInBand` exited 0 with 14/14 tests passing.

### Integration RED/GREEN

The first `pnpm run build` exited 1 because `ScheduleService` did not project the newly required stage `type`. Adding `type: stageRow.type` at the source fixed the mismatch; the final build exited 0.

## Final verification

- Focused tests: 2 suites, 14 tests passed.
- Full backend suite: 16 suites, 50 tests passed.
- Backend build: exit 0.
- `git diff --check`: exit 0.
- No diff under `apps/backend/drizzle`, `apps/backend/src/lib/infrastructure/db`, or the seed script; the legacy `team_participants.seed` migration and all migration artifacts are unchanged.

## Files

- `apps/backend/src/lib/domain/stage/stage.exception.ts`
- `apps/backend/src/modules/stage/dto/index.ts`
- `apps/backend/src/modules/stage/types/index.ts`
- `apps/backend/src/modules/stage/stage.service.ts`
- `apps/backend/src/modules/stage/stage.service.spec.ts`
- `apps/backend/src/modules/match/dto/index.ts`
- `apps/backend/src/modules/match/match.service.ts`
- `apps/backend/src/modules/match/match.service.spec.ts`
- `apps/backend/src/modules/match/schedule.service.ts` (required by the stage schedule DTO/build)

## Self-review

- The concurrency translation checks both PostgreSQL code `23505` and the exact constraint `stages_one_qualification_per_tournament`; unrelated uniqueness errors are rethrown unchanged.
- The friendly pre-check includes tournament, qualification type, and non-deleted predicates. Updates check only when changing from regular to qualification.
- Both create and update obtain the persisted stage and pass it to the single competitor-validation path.
- Qualification validation returns before regular solo/team lookup only after requiring an mp URL and rejecting players or either team ID. Regular validation is otherwise unchanged.
- Match request DTOs remain permissive; persisted stage state controls service validation.

## Concerns

None. The brief's example names `internalErrorCode`, while this repository's established `DomainException` wire field is `errorCode`; tests verify the existing wire contract without changing global exception behavior.
