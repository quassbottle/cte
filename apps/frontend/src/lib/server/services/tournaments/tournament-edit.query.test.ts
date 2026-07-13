import { describe, expect, test } from 'bun:test';
import { getTournamentEditPage } from './tournament-edit.query';

describe('getTournamentEditPage', () => {
	test('loads registered participants for solo match player selection', async () => {
		const participants = [
			{
				id: 'player-id',
				osuId: 42,
				osuUsername: 'player',
				avatarUrl: 'https://a.ppy.sh/42'
			}
		];
		const backend = {
			tournaments: {
				getById: async () => ({
					data: {
						id: 'tournament-id',
						creatorId: 'owner-id',
						archivedAt: null,
						isTeam: false
					}
				}),
				getParticipants: async () => ({ data: participants }),
				getSchedule: async () => ({ data: [] }),
				getTeams: async () => ({ data: [] })
			},
			stages: {
				findByTournament: async () => ({ data: [] })
			},
			mappools: {
				findByTournamentForManagement: async () => ({ data: [] })
			}
		};

		const result = await getTournamentEditPage(backend as never, 'tournament-id', {
			id: 'owner-id',
			role: 'default'
		});

		expect(result.participants).toEqual(participants);
	});
});
