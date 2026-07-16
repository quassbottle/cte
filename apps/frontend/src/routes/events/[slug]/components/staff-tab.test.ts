import { describe, expect, test } from 'bun:test';
import { visibleStaffRoles } from './staff-tab';

describe('visibleStaffRoles', () => {
	test('puts Host first and removes empty roles', () => {
		const roles = visibleStaffRoles([
			{ id: 'commentator', name: 'Commentator', canParticipate: true, members: [{ id: '1' }] },
			{ id: 'referee', name: 'Referee', canParticipate: false, members: [] },
			{ id: 'host', name: 'Host', canParticipate: false, members: [{ id: '2' }] }
		] as never);

		expect(roles.map(({ name }) => name)).toEqual(['Host', 'Commentator']);
	});
});
