import { describe, expect, it } from 'bun:test';
import {
	qualificationCompetitorFormSchema,
	scheduleMatchFormSchema,
	stageCreateFormSchema
} from './tournament-edit.schema';

describe('qualification forms', () => {
	it('keeps the qualification stage type', () => {
		expect(
			stageCreateFormSchema.parse({
				name: 'Qualifier',
				type: 'qualification',
				startsAt: '2026-07-12T10:00:00.000Z',
				endsAt: '2026-07-12T11:00:00.000Z'
			}).type
		).toBe('qualification');
	});

	it('clears the withdrawal reason when the competitor is active', () => {
		expect(
			qualificationCompetitorFormSchema.parse({
				seed: '',
				withdrawn: 'false',
				withdrawalReason: 'old reason'
			})
		).toEqual({ seed: null, withdrawn: false, withdrawalReason: null });
	});
});

describe('scheduleMatchFormSchema', () => {
	it('accepts omitted disabled score fields', () => {
		const result = scheduleMatchFormSchema.parse({
			name: 'Match',
			stageId: 'stage',
			startsAt: '2026-07-12T10:00:00.000Z',
			endsAt: '2026-07-12T11:00:00.000Z',
			mpUrl: '',
			vodUrl: '',
			player1UserId: 'player-1',
			player2UserId: 'player-2'
		});

		expect(result.players).toEqual([
			{ userId: 'player-1', score: null },
			{ userId: 'player-2', score: null }
		]);
	});
});
