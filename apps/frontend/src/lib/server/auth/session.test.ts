import { describe, expect, it, mock } from 'bun:test';
import { loadViewer, readSession, resolveSession } from './session';

describe('server session', () => {
	it('reads only the backend token from the HttpOnly session cookie', () => {
		const session = readSession({
			get: () => 'backend-jwt'
		});

		expect(session).toEqual({ token: 'backend-jwt' });
	});

	it('returns a safe viewer without exposing the token', async () => {
		const viewer = {
			id: 'user-1',
			osuId: 1,
			osuUsername: 'player',
			osuCoverUrl: null,
			defaultMode: 'osu' as const,
			role: 'default' as const,
			avatarUrl: 'https://a.ppy.sh/1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z'
		};

		const result = await loadViewer(
			{ token: 'backend-jwt' },
			{
				delete: mock(() => undefined)
			},
			async () => viewer
		);

		expect(result).toEqual(viewer);
		expect('token' in result!).toBe(false);
	});

	it('removes an invalid session cookie after backend 401', async () => {
		const remove = mock(() => undefined);

		const result = await loadViewer({ token: 'expired-jwt' }, { delete: remove }, async () => {
			throw { status: 401 };
		});

		expect(result).toBeNull();
		expect(remove).toHaveBeenCalledWith('session', { path: '/' });
	});

	it('resolves a server session while keeping the token out of the viewer', async () => {
		const viewer = {
			id: 'user-1',
			osuId: 1,
			osuUsername: 'player',
			osuCoverUrl: null,
			defaultMode: 'osu' as const,
			role: 'default' as const,
			avatarUrl: 'https://a.ppy.sh/1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z'
		};

		const session = await resolveSession(
			{
				get: () => 'backend-jwt',
				delete: mock(() => undefined)
			},
			async () => viewer
		);

		expect(session).toEqual({ token: 'backend-jwt', user: viewer });
		expect('token' in session!.user).toBe(false);
	});
});
