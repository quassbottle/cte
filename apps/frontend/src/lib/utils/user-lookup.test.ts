import { afterEach, describe, expect, it, mock } from 'bun:test';
import { lookupSelectedUser } from './user-lookup';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('lookupSelectedUser', () => {
	it('loads selected user data through the local lookup endpoint', async () => {
		globalThis.fetch = mock(async (input: RequestInfo | URL) => {
			expect(String(input)).toBe('/api/users/lookup?query=WhiteCat');

			return new Response(
				JSON.stringify({
					id: 'user-id',
					osuId: 4504101,
					osuUsername: 'WhiteCat',
					countryCode: 'DE',
					defaultMode: 'osu',
					role: 'user',
					createdAt: '2026-01-01T00:00:00Z',
					updatedAt: '2026-01-01T00:00:00Z'
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			);
		}) as unknown as typeof fetch;

		await expect(lookupSelectedUser('WhiteCat')).resolves.toEqual({
			id: 'user-id',
			osuId: 4504101,
			osuUsername: 'WhiteCat',
			avatarUrl: 'https://a.ppy.sh/4504101'
		});
	});

	it('throws a stable error when lookup fails', async () => {
		globalThis.fetch = mock(
			async () => new Response('Not found', { status: 404 })
		) as unknown as typeof fetch;

		await expect(lookupSelectedUser('missing')).rejects.toThrow('User not found.');
	});
});
