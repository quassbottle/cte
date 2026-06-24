import { describe, expect, it, mock } from 'bun:test';

mock.module('$lib/server/backend/client', () => ({
	createBackendClient: () => ({
		tournaments: {
			findMany: (input: unknown) => Promise.resolve({ data: [{ input }] })
		}
	})
}));

const { load } = await import('../../../../routes/events/+page.server');

describe('/events server load', () => {
	it('uses the mode from the URL when it is valid', async () => {
		const result = (await load({
			fetch,
			url: new URL('https://example.com/events?mode=mania'),
			parent: async () => ({ user: { defaultMode: 'taiko' } })
		} as never)) as { selectedMode: string; tournaments: { input: unknown }[] };

		expect(result.selectedMode).toBe('mania');
		expect(result.tournaments[0].input).toMatchObject({ mode: 'mania' });
	});

	it('falls back to the osu account default mode during SSR', async () => {
		const result = (await load({
			fetch,
			url: new URL('https://example.com/events'),
			parent: async () => ({ user: { defaultMode: 'fruits' } })
		} as never)) as { selectedMode: string; tournaments: { input: unknown }[] };

		expect(result.selectedMode).toBe('fruits');
		expect(result.tournaments[0].input).toMatchObject({ mode: 'fruits' });
	});

	it('loads all tournament modes when the All tab is selected', async () => {
		const result = (await load({
			fetch,
			url: new URL('https://example.com/events?mode=all'),
			parent: async () => ({ user: { defaultMode: 'mania' } })
		} as never)) as { selectedMode: string; tournaments: { input: { mode?: string } }[] };

		expect(result.selectedMode).toBe('all');
		expect(result.tournaments[0].input).not.toHaveProperty('mode');
	});
});
