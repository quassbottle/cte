import type {
	AddMappoolBeatmapDto,
	CreateTournamentDto,
	CreateMappoolDto,
	CreateStageDto,
	ScheduleMatchUpsertDto,
	TournamentControllerFindManyParams,
	UpdateMappoolBeatmapDto,
	UpdateMappoolDto,
	UpdateStageDto,
	UpdateTournamentDto
} from '$lib/api/generated/model';
import {
	authControllerAuthCallback,
	authControllerInitLogin,
	mappoolControllerAddBeatmap,
	mappoolControllerCreate,
	mappoolControllerDeleteBeatmap,
	mappoolControllerFindBeatmaps,
	mappoolControllerPatch,
	mappoolControllerUpdateBeatmap,
	osuControllerGetBeatmapMetadata,
	stageControllerCreate,
	stageControllerFindMany,
	stageControllerPatch,
	stageControllerSoftDelete,
	tournamentControllerCreate,
	tournamentControllerCreateMatch,
	tournamentControllerDeleteMatch,
	tournamentControllerFindMany,
	tournamentControllerArchive,
	tournamentControllerGetById,
	tournamentControllerGetParticipants,
	tournamentControllerGetTeams,
	tournamentControllerPatch,
	tournamentControllerRegister,
	tournamentControllerUnregister,
	tournamentControllerUpdateMatch,
	tournamentMappoolControllerFindByTournament,
	tournamentMappoolControllerFindByTournamentForManagement,
	userControllerGetById,
	userControllerGetByLookup,
	userControllerGetMe,
	tournamentControllerGetSchedule
} from '$lib/server/backend/generated/endpoints';
import type { ServerSession } from '$lib/server/auth/session';
import { backendFetch } from './fetcher';

type BackendClientInput =
	| Pick<ServerSession, 'token'>
	| {
			fetch?: typeof globalThis.fetch;
			locals?: App.Locals;
			session?: Pick<ServerSession, 'token'> | null;
	  };

const resolveSession = (input?: BackendClientInput): Pick<ServerSession, 'token'> | null => {
	if (!input) {
		return null;
	}

	if ('token' in input) {
		return input;
	}

	return input.session ?? input.locals?.session ?? null;
};

const resolveFetch = (input?: BackendClientInput) => {
	if (!input || 'token' in input) {
		return undefined;
	}

	return input.fetch;
};

export function createBackendClient(input?: BackendClientInput) {
	const session = resolveSession(input);
	const requestFetch = resolveFetch(input);
	const options = {
		...(requestFetch ? { fetch: requestFetch } : {}),
		headers: {
			...(session ? { authorization: `Bearer ${session.token}` } : {})
		}
	};

	return {
		auth: {
			getLoginUrl: async () => {
				const response = await authControllerInitLogin(options);

				return response.data.url;
			},
			exchangeCode: async (code: string) => {
				const response = await authControllerAuthCallback({ code }, options);

				return response.data.token;
			}
		},
		tournaments: {
			create: (input: CreateTournamentDto) => tournamentControllerCreate(input, options),
			findMany: (input: TournamentControllerFindManyParams) =>
				tournamentControllerFindMany(input, options),
			archive: (id: string) => tournamentControllerArchive(id, options),
			getById: (id: string) => tournamentControllerGetById(id, options),
			getParticipants: (id: string) => tournamentControllerGetParticipants(id, undefined, options),
			getSchedule: (id: string) => tournamentControllerGetSchedule(id, options),
			getTeams: (id: string) => tournamentControllerGetTeams(id, options),
			update: (id: string, input: UpdateTournamentDto) =>
				tournamentControllerPatch(id, input, options),
			register: (id: string, input: Parameters<typeof tournamentControllerRegister>[1]) =>
				tournamentControllerRegister(id, input, options),
			unregister: (id: string) => tournamentControllerUnregister(id, options)
		},
		matches: {
			create: (tournamentId: string, input: ScheduleMatchUpsertDto) =>
				tournamentControllerCreateMatch(tournamentId, input, options),
			update: (tournamentId: string, matchId: string, input: ScheduleMatchUpsertDto) =>
				tournamentControllerUpdateMatch(tournamentId, matchId, input, options),
			delete: (tournamentId: string, matchId: string) =>
				tournamentControllerDeleteMatch(tournamentId, matchId, options),
			sync: (matchId: string) =>
				backendFetch(`/api/matches/${matchId}/sync`, { ...options, method: 'POST' }),
			stopSync: (matchId: string) =>
				backendFetch(`/api/matches/${matchId}/sync`, { ...options, method: 'DELETE' })
		},
		stages: {
			findByTournament: (tournamentId: string) => stageControllerFindMany(tournamentId, options),
			create: (tournamentId: string, input: CreateStageDto) =>
				stageControllerCreate(tournamentId, input, options),
			update: (tournamentId: string, stageId: string, input: UpdateStageDto) =>
				stageControllerPatch(tournamentId, stageId, input, options),
			delete: (tournamentId: string, stageId: string) =>
				stageControllerSoftDelete(tournamentId, stageId, options)
		},
		mappools: {
			findByTournament: (tournamentId: string) =>
				tournamentMappoolControllerFindByTournament(tournamentId, options),
			findByTournamentForManagement: (tournamentId: string) =>
				tournamentMappoolControllerFindByTournamentForManagement(tournamentId, options),
			findBeatmaps: (mappoolId: string) => mappoolControllerFindBeatmaps(mappoolId, options),
			create: (input: CreateMappoolDto) => mappoolControllerCreate(input, options),
			update: (mappoolId: string, input: UpdateMappoolDto) =>
				mappoolControllerPatch(mappoolId, input, options),
			addBeatmap: (mappoolId: string, input: AddMappoolBeatmapDto) =>
				mappoolControllerAddBeatmap(mappoolId, input, options),
			updateBeatmap: (mappoolId: string, osuBeatmapId: number, input: UpdateMappoolBeatmapDto) =>
				mappoolControllerUpdateBeatmap(mappoolId, osuBeatmapId, input, options),
			deleteBeatmap: (mappoolId: string, osuBeatmapId: number) =>
				mappoolControllerDeleteBeatmap(mappoolId, osuBeatmapId, options)
		},
		osu: {
			getBeatmapMetadata: (beatmapId: number) => osuControllerGetBeatmapMetadata(beatmapId, options)
		},
		users: {
			me: () => userControllerGetMe(options),
			getById: (id: string) => userControllerGetById(id, options),
			lookup: (query: string) => userControllerGetByLookup({ query }, options)
		}
	};
}

export type BackendClient = ReturnType<typeof createBackendClient>;
