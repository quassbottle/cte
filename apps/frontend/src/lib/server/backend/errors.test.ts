import { describe, expect, it } from 'bun:test';
import { BackendRequestError } from './fetcher';
import { throwBackendError } from './errors';

describe('throwBackendError', () => {
	it('preserves backend 5xx errors for the global server error handler', () => {
		const cause = new BackendRequestError({
			status: 500,
			message: 'database failed',
			body: { message: 'database failed' },
			url: 'http://backend:3000/api/tournaments/id'
		});

		expect(() => throwBackendError(cause, 404, 'Tournament not found')).toThrow(cause);
	});

	it('keeps backend 4xx errors as user-facing HTTP errors', () => {
		const cause = new BackendRequestError({
			status: 404,
			message: 'not found',
			body: { message: 'not found' },
			url: 'http://backend:3000/api/tournaments/id'
		});

		expect(() => throwBackendError(cause, 404, 'Tournament not found')).toThrow(
			expect.objectContaining({ status: 404, body: { message: 'not found' } })
		);
	});
});
