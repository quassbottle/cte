import { describe, expect, it } from 'bun:test';
import { handleBffRequest } from './http-handler';

describe('handleBffRequest', () => {
	it('delegates the request to Elysia', async () => {
		const response = await handleBffRequest(new Request('http://localhost/bff/health'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});
});
