import { createBackendClient } from '$lib/server/backend/client';
import { getTournamentList } from '$lib/server/services/tournaments/tournament-list.query';
import type { OsuMode } from '$lib/api/types';
import type { TournamentStatusFilter } from '$lib/utils/events-filter';
import type { PageServerLoad } from './$types';

const TOURNAMENT_MODES = ['osu', 'taiko', 'fruits', 'mania'] as const;
type TournamentModeFilter = OsuMode | 'all';

const isTournamentMode = (value: string | null): value is OsuMode =>
	TOURNAMENT_MODES.some((mode) => mode === value);

const resolveSelectedMode = (value: string | null, defaultMode: OsuMode): TournamentModeFilter => {
	if (value === 'all') return value;
	if (isTournamentMode(value)) return value;

	return defaultMode;
};

const resolveSelectedStatus = (
	value: string | null,
	isAdmin: boolean
): TournamentStatusFilter => {
	if (value === 'archived' || (value === 'deleted' && isAdmin)) return value;
	return 'active';
};

export const load: PageServerLoad = async (event) => {
	const { parent, url } = event;
	const { user } = await parent();
	const isAdmin = user?.role === 'admin';
	const page = Number(url.searchParams.get('page') ?? 0);
	const limit = 20;
	const offset = page * limit;
	const urlMode = url.searchParams.get('mode');
	const selectedStatus = resolveSelectedStatus(url.searchParams.get('status'), isAdmin);
	const selectedMode = resolveSelectedMode(urlMode, user?.defaultMode ?? 'osu');
	const modeFilter = selectedMode === 'all' ? {} : { mode: selectedMode };

	const tournaments = await getTournamentList(createBackendClient(event), {
		limit,
		offset,
		status: selectedStatus,
		...modeFilter
	});

	return {
		tournaments: tournaments.data,
		isAdmin,
		selectedMode,
		selectedStatus
	};
};
