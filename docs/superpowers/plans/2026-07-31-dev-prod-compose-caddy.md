# Dev/Prod Compose and Caddy Implementation Plan

1. Replace `apps/infra/docker-compose.yml` with dev and prod variants while
   preserving the production project and volume names.
2. Add the production Caddyfile for `cte.quas.su` and `api.cte.quas.su`.
3. Keep the backend and frontend deployment workflows independent and switch
   both to the production Compose file.
4. Run Compose/Caddy validation where Docker is available, project checks, and
   `graphify update .`.
