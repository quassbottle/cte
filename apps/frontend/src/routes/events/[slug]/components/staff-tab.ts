import type { TournamentStaffRoleDto } from '$lib/api/generated/model';

export const sortedStaffRoles = (roles: TournamentStaffRoleDto[]) =>
	[...roles].sort((a, b) => Number(b.name === 'Host') - Number(a.name === 'Host'));

export const visibleStaffRoles = (roles: TournamentStaffRoleDto[]) =>
	sortedStaffRoles(roles).filter((role) => role.members.length > 0);
