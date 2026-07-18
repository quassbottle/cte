import { describe, expect, it } from 'bun:test';
import { scheduleMatchFormSchema } from './tournament-edit.schema';

describe('scheduleMatchFormSchema', () => {
	it('builds schedule match payload from flat form values', () => {
		const parsed = scheduleMatchFormSchema.parse({
			name: 'Grand Finals',
			stageId: 'stage-1',
			matchNumber: '43c',
			startsAt: '2026-07-10T16:00',
			endsAt: '2026-07-10T17:00',
			mpUrl: '',
			vodUrl: 'https://example.com/vod',
			player1UserId: 'user-1',
			player2UserId: 'user-2',
			refereeId: 'ref-1',
			streamerId: 'stream-1',
			commentatorIds: 'com-1, com-2'
		});

		expect(parsed.matchNumber).toBe('43c');
		expect(parsed.mpUrl).toBeNull();
		expect(parsed.players).toEqual([{ userId: 'user-1' }, { userId: 'user-2' }]);
		expect(parsed.staff).toEqual([
			{ userId: 'ref-1', role: 'referee' },
			{ userId: 'stream-1', role: 'streamer' },
			{ userId: 'com-1', role: 'commentator' },
			{ userId: 'com-2', role: 'commentator' }
		]);
	});

	it('builds a team match payload', () => {
		const parsed = scheduleMatchFormSchema.parse({
			name: 'Team Finals',
			stageId: 'stage-1',
			startsAt: '2026-07-10T16:00',
			endsAt: '2026-07-10T17:00',
			mpUrl: '',
			vodUrl: '',
			redTeamId: 'red-team',
			blueTeamId: 'blue-team'
		});

		expect(parsed).toMatchObject({
			redTeamId: 'red-team',
			blueTeamId: 'blue-team',
			players: []
		});
	});
});
