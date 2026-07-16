import { describe, expect, test } from 'bun:test';
import { getTournamentEditPage } from './tournament-edit.query';

describe('getTournamentEditPage', () => {
	test('does not preload competitors for schedule editing', async () => {
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
				getParticipants: async () => {
					throw new Error('competitors must be searched on demand');
				},
				getSchedule: async () => ({ data: [] }),
				getTeams: async () => ({ data: [] }),
				qualification: {
					getRoster: async () => ({ data: { kind: 'solo', participants: [] } })
				},
				staff: { get: async () => ({ data: [] }) }
			},
			stages: {
				findByTournament: async () => ({ data: [] })
			},
			qualificationLobbies: {
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

		expect(result).not.toHaveProperty('participants');
		expect(result).not.toHaveProperty('teams');
		expect(result.qualificationRoster).toEqual({ kind: 'solo', participants: [] });
	});
});
