# Zod Responses and Tournament Match Participants

## Scope

- Replace every typed `ApiResponse`/`ApiOkResponse` in backend HTTP controllers with `ZodResponse`.
- Pass DTO classes directly to `ZodResponse`; never use `Dto.Output` as Swagger metadata.
- Remove controller-level response `schema.parse(...)` calls and let the global `ZodSerializerInterceptor` serialize responses.
- Keep untyped `ApiResponse` declarations for `void` endpoints.
- Route mappool management authorization through the existing policy guard instead of checking creator/admin and archive state in the controller.
- Prevent solo tournament matches from containing users who are not registered tournament participants, in both the editor UI and backend.

## Response Flow

Each typed controller method uses `@ZodResponse({ status, description, type })`. Scalar responses use `type: Dto`; arrays use `type: [Dto]`. Controller methods return service values or the minimum object shaping required to add computed fields. `ZodSerializerInterceptor` performs schema parsing or codec encoding according to the DTO definition.

Existing codec DTO methods already using `ZodResponse` remain unchanged unless their controller contains redundant manual serialization. Non-controller parsing used for request validation, external APIs, environment configuration, or service-level data shaping is out of scope.

## Mappool Management Policy

The management GET endpoint uses `JwtUserGuard`, `PoliciesGuard`, and `CheckPolicies` with the existing mappool update permission. `MappoolPolicyContextResolver` recognizes only the management GET route, resolves the tournament from `tournamentId`, and retains the shared archived-tournament rejection. Public mappool GET routes remain public.

## Match Participant Integrity

The tournament edit page loads solo participants alongside its existing data. For solo matches, the player fields select only from this list; staff fields keep their global user lookup because staff need not be tournament participants. Team matches keep their existing team selectors.

`MatchService.assertMatchCompetitors` validates every solo player ID against `solo_participants` for the route tournament before either create or update writes data. A foreign player rejects the request with a domain error. Team ownership validation remains unchanged.

Existing invalid matches are not migrated automatically. Editing one requires choosing valid participants before it can be saved.

## Verification

- A backend regression test demonstrates that create/update competitor validation rejects a user outside the tournament and accepts registered participants.
- Controller compilation verifies every `ZodResponse` return contract.
- Frontend tests cover mapping/selecting tournament participants where practical.
- Run backend typecheck/build and relevant tests, frontend checks/tests, and a final search proving typed `ApiResponse`, `Dto.Output` metadata, and controller response `schema.parse` patterns are gone.
