import { createBackendClient } from '$lib/server/backend/client';
import { getTournamentList } from '$lib/server/services/tournaments/tournament-list.query';
import type { OsuMode } from '$lib/api/types';
import type { PageServerLoad } from './$types';

const TOURNAMENT_MODES = ['osu', 'taiko', 'fruits', 'mania'] as const;
type TournamentModeFilter = OsuMode | 'all';
type TournamentStatusFilter = 'active' | 'archived';

const isTournamentMode = (value: string | null): value is OsuMode =>
	TOURNAMENT_MODES.some((mode) => mode === value);

const resolveSelectedMode = (value: string | null, defaultMode: OsuMode): TournamentModeFilter => {
	if (value === 'all') return value;
	if (isTournamentMode(value)) return value;

	return defaultMode;
};

const resolveSelectedStatus = (value: string | null): TournamentStatusFilter =>
	value === 'archived' ? value : 'active';

export const load: PageServerLoad = async ({ fetch, parent, url }) => {
	const { user } = await parent();
	const page = Number(url.searchParams.get('page') ?? 0);
	const limit = 20;
	const offset = page * limit;
	const urlMode = url.searchParams.get('mode');
	const selectedStatus = resolveSelectedStatus(url.searchParams.get('status'));
	const selectedMode = resolveSelectedMode(urlMode, user?.defaultMode ?? 'osu');
	const modeFilter = selectedMode === 'all' ? {} : { mode: selectedMode };

	const tournaments = await getTournamentList(createBackendClient({ fetch }), {
		limit,
		offset,
		status: selectedStatus,
		...modeFilter
	});

	return {
		tournaments: tournaments.data,
		selectedMode,
		selectedStatus
	};
};
