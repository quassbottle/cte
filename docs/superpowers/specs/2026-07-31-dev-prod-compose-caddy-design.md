# Dev/Prod Compose and Caddy Design

## Goal

Separate local development and production Docker Compose stacks, terminate
public HTTPS with Caddy, and deploy the complete production stack from CI.

## Runtime layout

- `apps/infra/docker-compose.dev.yml` keeps application, PostgreSQL, and NATS
  ports available on loopback and reads the repository-local application env
  files.
- `apps/infra/docker-compose.prod.yml` keeps PostgreSQL, NATS, backend, and
  frontend private to the Compose network. Only Caddy publishes ports 80 and
  443.
- The production Compose project remains named `cte` so the existing
  PostgreSQL and NATS named volumes continue to be used.
- Caddy stores ACME account data, certificates, and keys in a persistent named
  volume.

## Routing and TLS

- `https://cte.quas.su` proxies all requests to `frontend:3000`.
- `https://api.cte.quas.su` proxies all requests to `backend:3000` without
  rewriting paths.
- Caddy Automatic HTTPS obtains and renews publicly trusted certificates.
  Certbot is not included.
- DNS for both hostnames must resolve to the production VPS, with inbound TCP
  ports 80/443 and UDP port 443 available.

## Deployment

The backend and frontend keep their independent production workflows and path
filters. Both workflows use the production Compose file. The backend workflow
also starts PostgreSQL, NATS, runs migrations, and deploys Caddy; the frontend
workflow deploys the frontend and Caddy.

## Verification

- `docker compose config` validates both files when Docker is available.
- `caddy validate` validates the production Caddyfile.
- Existing backend and frontend test/build checks remain unchanged.
