import { describe, expect, it } from 'bun:test';
import { bff } from './client';

describe('server-only Eden client', () => {
	it('calls the Elysia app in-process', async () => {
		const { data, error, status } = await bff.bff.health.get();

		expect(error).toBeNull();
		expect(status).toBe(200);
		expect(data).toEqual({
			status: 'ok',
			service: 'frontend-bff'
		});
	});
});
