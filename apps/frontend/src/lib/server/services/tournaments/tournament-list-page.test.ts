import { describe, expect, it, mock } from 'bun:test';

mock.module('$lib/server/backend/client', () => ({
	createBackendClient: () => ({
		tournaments: {
			findMany: (input: unknown) => Promise.resolve({ data: [{ input }] })
		}
	})
}));

const { load } = await import('../../../../routes/events/+page.server');
const { getEventsModeHref } = await import('../../../utils/events-filter');

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

	it('loads archived tournaments separately from active tournaments', async () => {
		const result = (await load({
			fetch,
			url: new URL('https://example.com/events?status=archived&mode=all'),
			parent: async () => ({ user: { defaultMode: 'osu' } })
		} as never)) as {
			selectedStatus: string;
			tournaments: { input: { status?: string; mode?: string } }[];
		};

		expect(result.selectedStatus).toBe('archived');
		expect(result.tournaments[0].input).toMatchObject({ status: 'archived' });
		expect(result.tournaments[0].input).not.toHaveProperty('mode');
	});

	it('loads deleted tournaments for an administrator', async () => {
		const result = (await load({
			fetch,
			locals: {
				session: {
					token: 'token',
					user: { role: 'admin', defaultMode: 'osu' }
				}
			},
			url: new URL('https://example.com/events?status=deleted&mode=all'),
			parent: async () => ({
				user: { role: 'admin', defaultMode: 'osu' }
			})
		} as never)) as {
			selectedStatus: string;
			tournaments: { input: { status?: string } }[];
		};

		expect(result.selectedStatus).toBe('deleted');
		expect(result.tournaments[0].input.status).toBe('deleted');
	});

	it('falls back to active when a non-admin requests deleted', async () => {
		const result = (await load({
			fetch,
			locals: { session: null },
			url: new URL('https://example.com/events?status=deleted&mode=all'),
			parent: async () => ({
				user: { role: 'default', defaultMode: 'osu' }
			})
		} as never)) as {
			selectedStatus: string;
			tournaments: { input: { status?: string } }[];
		};

		expect(result.selectedStatus).toBe('active');
		expect(result.tournaments[0].input.status).toBe('active');
	});

	it('keeps the archived status in mode tab links', () => {
		expect(getEventsModeHref('mania', 'archived')).toBe('/events?status=archived&mode=mania');
	});
});
