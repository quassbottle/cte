import { describe, expect, test } from 'bun:test';
import { getTournamentPage } from './tournament-page.query';

const tournamentPageBackend = (tournament: Record<string, unknown>) => {
	const empty = async () => ({ data: [] });
	return {
		tournaments: {
			getById: async () => ({ data: tournament }),
			getParticipants: empty,
			getTeams: empty,
			getSchedule: empty,
			staff: { get: empty }
		},
		stages: { findByTournament: empty },
		qualificationLobbies: { findByTournament: empty },
		mappools: { findByTournament: empty },
		users: { getById: async () => ({ data: { id: tournament.creatorId } }) }
	};
};

describe('getTournamentPage', () => {
	test('allows an admin to edit a tournament owned by another user', async () => {
		const backend = tournamentPageBackend({ creatorId: 'owner-id', deletedAt: null });

		const result = await getTournamentPage(backend as never, 'tournament-id', {
			id: 'admin-id',
			role: 'admin'
		});

		expect(result.canEditTournament).toBe(true);
	});

	test('makes a deleted tournament read-only for an admin', async () => {
		const backend = tournamentPageBackend({
			creatorId: 'owner-id',
			deletedAt: '2026-07-31T00:00:00.000Z'
		});

		const result = await getTournamentPage(backend as never, 'tournament-id', {
			id: 'admin-id',
			role: 'admin'
		});

		expect(result.canEditTournament).toBe(false);
		expect(result.canDeleteTournament).toBe(false);
	});

	test('loads backend-sorted statistics only for the selected stage', async () => {
		const empty = async () => ({ data: [] });
		let receivedParams: unknown;
		const backend = {
			tournaments: {
				getById: async () => ({ data: { creatorId: 'owner-id' } }),
				getParticipants: empty,
				getTeams: empty,
				getSchedule: empty,
				staff: { get: empty }
			},
			stages: {
				findByTournament: async () => ({ data: [{ id: 'stage-id', type: 'regular' }] }),
				getStatistics: async (_tournamentId: string, stageId: string, params: unknown) => {
					receivedParams = { stageId, params };
					return { data: { stageId, maps: [], competitors: [] } };
				}
			},
			qualificationLobbies: { findByTournament: empty },
			mappools: { findByTournament: empty },
			users: { getById: async () => ({ data: { id: 'owner-id' } }) }
		};

		const result = await getTournamentPage(backend as never, 'tournament-id', undefined, {
			stageId: 'stage-id',
			view: 'players',
			sortBeatmapId: 11,
			sortDirection: 'desc'
		});

		expect(receivedParams).toEqual({
			stageId: 'stage-id',
			params: { view: 'players', sortBeatmapId: 11, sortDirection: 'desc' }
		});
		expect(result.stageStatistics).toEqual({
			stageId: 'stage-id',
			maps: [],
			competitors: []
		});
	});
});
