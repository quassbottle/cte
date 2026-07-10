import { afterEach, describe, expect, it, mock } from 'bun:test';
import { BackendRequestError, backendFetch } from './fetcher';

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

	it('preserves backend error details as an Error instance', async () => {
		process.env.BACKEND_API_URL = 'http://backend.test';
		globalThis.fetch = mock(async () =>
			Response.json({ message: 'Invalid OAuth code' }, { status: 401 })
		) as unknown as typeof fetch;

		await expect(backendFetch('/api/auth/auth-callback')).rejects.toMatchObject({
			name: 'BackendRequestError',
			status: 401,
			message: 'Invalid OAuth code',
			url: 'http://backend.test/api/auth/auth-callback'
		});

		await expect(backendFetch('/api/auth/auth-callback')).rejects.toBeInstanceOf(BackendRequestError);
	});

	it('retains the underlying connection failure as a cause', async () => {
		process.env.BACKEND_API_URL = 'http://backend.test';
		const cause = new Error('connect ECONNREFUSED');
		globalThis.fetch = mock(async () => {
			throw cause;
		}) as unknown as typeof fetch;

		try {
			await backendFetch('/api/users/me');
			expect.unreachable('Expected backendFetch to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(BackendRequestError);
			expect((error as BackendRequestError).status).toBe(502);
			expect((error as BackendRequestError).cause).toBe(cause);
		}
	});
});
