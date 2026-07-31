import { afterEach, describe, expect, it } from 'bun:test';
import { actions } from './+page.server';

describe('qualification lobby actions', () => {
	afterEach(() => delete process.env.BACKEND_API_URL);

	it("does not forward a browser-supplied solo user's id", async () => {
		process.env.BACKEND_API_URL = 'http://backend.test';
		let requestInit: RequestInit | undefined;
		const form = new FormData();
		form.set('lobbyId', 'lobby');
		form.set('userId', 'another-user');

		await actions.selectQualificationLobbySolo({
			locals: { session: { token: 'token', user: { id: 'viewer' } } },
			params: { slug: 'tournament' },
			request: new Request('http://frontend.test/events/tournament', {
				method: 'POST',
				body: form
			}),
			fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
				requestInit = init;
				return new Response('', { status: 201 });
			}
		} as never);

		expect(requestInit?.body).toBeUndefined();
	});

	it('rejects tournament deletion by a non-admin', async () => {
		const result = await actions.deleteTournament({
			locals: {
				session: {
					token: 'token',
					user: { id: 'owner-id', role: 'default' }
				}
			},
			params: { slug: 'tournament-1' }
		} as never);

		expect(result).toMatchObject({
			status: 403,
			data: { deleteError: 'Only site administrators can delete tournaments.' }
		});
	});

	it('soft-deletes a tournament as admin', async () => {
		process.env.BACKEND_API_URL = 'http://backend.test';
		let request: Request | undefined;

		await expect(
			actions.deleteTournament({
				locals: {
					session: {
						token: 'token',
						user: { id: 'admin-id', role: 'admin' }
					}
				},
				params: { slug: 'tournament-1' },
				fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
					request = new Request(input, init);
					return Response.json({ id: 'tournament-1' });
				}
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/events?status=deleted&mode=all'
		});

		expect(request?.method).toBe('DELETE');
	});
});
