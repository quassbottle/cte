# Centralized Beatmap Cover URL Design

## Goal

Make the backend the only place that knows how osu! beatmap cover URLs are constructed.

## Design

- Add one backend helper that converts an osu beatmapset ID into the canonical `cover@2x.jpg` URL.
- Use that helper in every backend mapper that returns beatmap presentation data.
- Add `coverUrl` to beatmap API DTOs that currently force the frontend to construct it.
- Remove direct `assets.ppy.sh` URL construction from Svelte components.
- Keep the URL as a response field rather than exposing integration-specific path rules to the frontend.

## Boundaries

- No configurable CDN abstraction, service class, or dependency injection.
- No persistence or database migration: `coverUrl` remains derived data.
- Generated frontend API types are refreshed from OpenAPI rather than edited manually.

## Verification

- One backend unit test covers the canonical URL conversion.
- Repository search confirms no production code outside the backend helper contains the osu cover URL template.
- Backend tests, frontend checks, and production build pass.
