import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const file = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('production Docker images', () => {
	for (const app of ['backend', 'frontend']) {
		it(`${app} has a multi-stage image with healthcheck`, () => {
			const path = `apps/${app}/Dockerfile`;

			expect(existsSync(resolve(root, path))).toBe(true);
			expect(file(path).match(/^FROM /gm)?.length ?? 0).toBeGreaterThanOrEqual(2);
			expect(file(path)).toContain('HEALTHCHECK');
		});
  }

  it('installs frontend dependencies with Bun', () => {
    const dockerfile = file('apps/frontend/Dockerfile');

    expect(dockerfile).toContain('RUN bun install --no-save');
    expect(dockerfile).not.toContain('pnpm install');
  });
});

describe('production Compose services', () => {
  const compose = file('apps/infra/docker-compose.yml');

  it('defines independently built backend and frontend services', () => {
    expect(compose).toContain('  backend:');
    expect(compose).toContain('dockerfile: apps/backend/Dockerfile');
    expect(compose).toContain('  frontend:');
    expect(compose).toContain('dockerfile: apps/frontend/Dockerfile');
  });

  it('loads VPS-owned env files and binds loopback ports', () => {
    expect(compose).toContain('${CTE_ENV_DIR:-/opt/cte/env}/backend.env');
    expect(compose).toContain('${CTE_ENV_DIR:-/opt/cte/env}/frontend.env');
    expect(compose).toContain('127.0.0.1:${BACKEND_PORT:-3000}:3000');
    expect(compose).toContain('127.0.0.1:${FRONTEND_PORT:-5173}:3000');
  });
});

describe('independent deployment workflows', () => {
  const backendPath = '.github/workflows/deploy-backend.yml';
  const frontendPath = '.github/workflows/deploy-frontend.yml';

  it('provides separate backend and frontend workflows', () => {
    expect(existsSync(resolve(root, backendPath))).toBe(true);
    expect(existsSync(resolve(root, frontendPath))).toBe(true);
  });

  it('deploys only backend for backend paths', () => {
    const workflow = file(backendPath);
    expect(workflow).toContain("- 'apps/backend/**'");
    expect(workflow).not.toContain("- 'apps/frontend/**'");
    expect(workflow).toContain('up -d --build --no-deps --wait --wait-timeout 120 backend');
  });

  it('deploys only frontend for frontend paths', () => {
    const workflow = file(frontendPath);
    expect(workflow).toContain("- 'apps/frontend/**'");
    expect(workflow).not.toContain("- 'apps/backend/**'");
    expect(workflow).toContain('up -d --build --no-deps --wait --wait-timeout 120 frontend');
  });

  for (const path of [backendPath, frontendPath]) {
    it(`${path} targets the production self-hosted runner`, () => {
      const workflow = file(path);
      expect(workflow).toContain('runs-on: [self-hosted, linux, cte-prod]');
      expect(workflow).toContain('CTE_ENV_DIR: /opt/cte/env');
    });
  }
});
