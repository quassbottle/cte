# Infrastructure restart policy

Add `restart: unless-stopped` to the long-running PostgreSQL and NATS services
in `apps/infra/docker-compose.yml`, matching the existing backend and frontend
policy. This restarts infrastructure after a host reboot while preserving an
intentional manual stop.

Keep the one-shot `migrate` service without a restart policy.

Verify the Compose configuration and the infrastructure deployment test.
