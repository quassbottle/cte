import type {
	AddMappoolBeatmapDto,
	AssignTournamentStaffDto,
	CreateTournamentDto,
	CreateMappoolDto,
	CreateStageDto,
	QualificationLobbyUpsertDto,
	ScheduleMatchUpsertDto,
	TournamentControllerFindManyParams,
	TournamentControllerGetParticipantsParams,
	TournamentParticipantDto,
	UpdateMappoolBeatmapDto,
	UpdateMappoolDto,
	UpdateQualificationCompetitorDto,
	UpdateQualificationTeamParticipantDto,
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
	qualificationLobbyControllerCreate,
	qualificationLobbyControllerDelete,
	qualificationLobbyControllerFindByTournament,
	qualificationLobbyControllerSelectSolo,
	qualificationLobbyControllerSelectTeam,
	qualificationLobbyControllerStart,
	qualificationLobbyControllerStop,
	qualificationLobbyControllerUpdate,
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
	tournamentControllerAssignStaff,
	tournamentControllerGetById,
	tournamentControllerGetParticipants,
	tournamentControllerGetQualificationRoster,
	tournamentControllerGetStaff,
	tournamentControllerGetTeams,
	tournamentControllerPatch,
	tournamentControllerRegister,
	tournamentControllerRemoveStaff,
	tournamentControllerUnregister,
	tournamentControllerUpdateQualificationTeam,
	tournamentControllerUpdateQualificationTeamParticipant,
	tournamentControllerUpdateSoloQualificationParticipant,
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
			getParticipants: (id: string, params?: TournamentControllerGetParticipantsParams) =>
				tournamentControllerGetParticipants(id, params, options),
			searchParticipants: (id: string, query: string, signal?: AbortSignal) =>
				backendFetch<{ data: TournamentParticipantDto[] }>(
					`/api/tournaments/${id}/participants?${new URLSearchParams({ query, limit: '20' })}`,
					{ ...options, signal }
				),
			searchTeams: (id: string, query: string, signal?: AbortSignal) =>
				backendFetch<{ data: { id: string; name: string }[] }>(
					`/api/tournaments/${id}/teams/search?${new URLSearchParams({ query, limit: '20' })}`,
					{ ...options, signal }
				),
			getSchedule: (id: string) => tournamentControllerGetSchedule(id, options),
			getTeams: (id: string) => tournamentControllerGetTeams(id, options),
			staff: {
				get: (id: string) => tournamentControllerGetStaff(id, options),
				assign: (id: string, input: AssignTournamentStaffDto) =>
					tournamentControllerAssignStaff(id, input, options),
				remove: (id: string, roleId: string, userId: string) =>
					tournamentControllerRemoveStaff(id, roleId, userId, options)
			},
			update: (id: string, input: UpdateTournamentDto) =>
				tournamentControllerPatch(id, input, options),
			register: (id: string, input: Parameters<typeof tournamentControllerRegister>[1]) =>
				tournamentControllerRegister(id, input, options),
			unregister: (id: string) => tournamentControllerUnregister(id, options),
			qualification: {
				getRoster: (id: string) => tournamentControllerGetQualificationRoster(id, options),
				updateSolo: (id: string, userId: string, input: UpdateQualificationCompetitorDto) =>
					tournamentControllerUpdateSoloQualificationParticipant(id, userId, input, options),
				updateTeam: (id: string, teamId: string, input: UpdateQualificationCompetitorDto) =>
					tournamentControllerUpdateQualificationTeam(id, teamId, input, options),
				updateTeamMember: (
					id: string,
					teamId: string,
					userId: string,
					input: UpdateQualificationTeamParticipantDto
				) =>
					tournamentControllerUpdateQualificationTeamParticipant(id, teamId, userId, input, options)
			}
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
		qualificationLobbies: {
			findByTournament: (tournamentId: string) =>
				qualificationLobbyControllerFindByTournament(tournamentId, options),
			create: (tournamentId: string, input: QualificationLobbyUpsertDto) =>
				qualificationLobbyControllerCreate(tournamentId, input, options),
			update: (tournamentId: string, lobbyId: string, input: QualificationLobbyUpsertDto) =>
				qualificationLobbyControllerUpdate(tournamentId, lobbyId, input, options),
			delete: (tournamentId: string, lobbyId: string) =>
				qualificationLobbyControllerDelete(tournamentId, lobbyId, options),
			start: (tournamentId: string, lobbyId: string) =>
				qualificationLobbyControllerStart(tournamentId, lobbyId, options),
			stop: (tournamentId: string, lobbyId: string) =>
				qualificationLobbyControllerStop(tournamentId, lobbyId, options),
			selectSolo: (tournamentId: string, lobbyId: string) =>
				qualificationLobbyControllerSelectSolo(tournamentId, lobbyId, options),
			selectTeam: (tournamentId: string, lobbyId: string, teamId: string) =>
				qualificationLobbyControllerSelectTeam(tournamentId, lobbyId, { teamId }, options)
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
