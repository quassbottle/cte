import { describe, expect, it } from 'bun:test';
import { bffApp } from './app';

describe('bffApp', () => {
	it('returns typed health information', async () => {
		const response = await bffApp.handle(new Request('http://localhost/bff/health'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});

	it('returns 404 for an unknown route', async () => {
		const response = await bffApp.handle(new Request('http://localhost/bff/missing'));

		expect(response.status).toBe(404);
	});
});
