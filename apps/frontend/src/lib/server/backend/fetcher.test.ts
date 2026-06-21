import { afterEach, describe, expect, it, mock } from 'bun:test';
import { backendFetch } from './fetcher';

const originalFetch = globalThis.fetch;
const originalBackendApiUrl = process.env.BACKEND_API_URL;

afterEach(() => {
	globalThis.fetch = originalFetch;
	process.env.BACKEND_API_URL = originalBackendApiUrl;
});

describe('backendFetch', () => {
	it('returns the response envelope expected by Orval', async () => {
		process.env.BACKEND_API_URL = 'http://backend.test';
		globalThis.fetch = mock(async () =>
			Response.json({ id: 'user-1' }, { status: 200, headers: { 'x-request-id': 'request-1' } })
		) as unknown as typeof fetch;

		const result = await backendFetch<{ data: { id: string }; status: 200; headers: Headers }>(
			'/api/users/user-1',
			{ method: 'GET' }
		);

		expect(result.data).toEqual({ id: 'user-1' });
		expect(result.status).toBe(200);
		expect(result.headers.get('x-request-id')).toBe('request-1');
	});
});
