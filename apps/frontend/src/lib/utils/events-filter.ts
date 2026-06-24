import type { TournamentDto } from '$lib/api/types';

export type TournamentModeFilter = TournamentDto['mode'] | 'all';
export type TournamentStatusFilter = 'active' | 'archived';

export function getEventsModeHref(mode: TournamentModeFilter, status: TournamentStatusFilter) {
	const params = new URLSearchParams();
	params.set('status', status);
	params.set('mode', mode);

	return `/events?${params.toString()}`;
}

export function getEventsStatusHref(status: TournamentStatusFilter, mode: TournamentModeFilter) {
	const params = new URLSearchParams();
	params.set('status', status);
	params.set('mode', mode);

	return `/events?${params.toString()}`;
}
