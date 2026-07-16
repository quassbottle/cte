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
			fetch: async (_input, init) => {
				requestInit = init;
				return new Response('', { status: 201 });
			}
		} as never);

		expect(requestInit?.body).toBeUndefined();
	});
});
