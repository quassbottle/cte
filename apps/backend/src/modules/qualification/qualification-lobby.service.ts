import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, notInArray } from 'drizzle-orm';
import {
  QualificationLobbyException,
  QualificationLobbyExceptionCode,
} from 'lib/domain/qualification-lobby/qualification-lobby.exception';
import {
  QualificationLobbyId,
  qualificationLobbyId,
} from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  osuMultiplayerRooms,
  osuMultiplayerScores,
  qualificationLobbies,
  qualificationLobbyPlayers,
  qualificationLobbyTeams,
  Schema,
  soloParticipants,
  staffRoles,
  stages,
  teamParticipants,
  teams,
  tournamentStaffMembers,
  users,
} from 'lib/infrastructure/db';
import { OsuMultiplayerSyncService } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.service';
import { QualificationLobbyRepository } from './qualification-lobby.repository';
import { QualificationResultsService } from './qualification-results.service';

@Injectable()
export class QualificationLobbyService {
  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly repository: QualificationLobbyRepository,
    private readonly syncService: OsuMultiplayerSyncService,
    private readonly results: QualificationResultsService,
  ) {}

  public async create(input: {
    tournamentId: TournamentId;
    stageId: StageId;
    number: number;
    refereeId: UserId;
    startsAt: Date;
    endsAt: Date;
    mpUrl?: string | null;
  }) {
    await this.assertQualificationStage(input.stageId, input.tournamentId);
    await this.assertReferee(input.tournamentId, input.refereeId);
    const osuRoomId = input.mpUrl
      ? await this.syncService.ensureRoom(input.mpUrl)
      : null;
    const { tournamentId: _, ...data } = input;
    const [lobby] = await this.db
      .insert(qualificationLobbies)
      .values({ id: qualificationLobbyId(), ...data, osuRoomId })
      .returning();
    await this.results.invalidate(input.stageId);
    return lobby;
  }

  public async findByTournament(tournamentId: TournamentId) {
    const lobbies = await this.db
      .select({
        lobby: qualificationLobbies,
        refereeName: users.osuUsername,
      })
      .from(qualificationLobbies)
      .innerJoin(stages, eq(stages.id, qualificationLobbies.stageId))
      .innerJoin(users, eq(users.id, qualificationLobbies.refereeId))
      .where(
        and(
          eq(stages.tournamentId, tournamentId),
          eq(stages.type, 'qualification'),
        ),
      );
    return Promise.all(
      lobbies.map(async ({ lobby, refereeName }) => {
        const [players, selectedTeams, attempts] = await Promise.all([
          this.db
            .select({ id: users.id, name: users.osuUsername })
            .from(qualificationLobbyPlayers)
            .innerJoin(users, eq(users.id, qualificationLobbyPlayers.userId))
            .where(eq(qualificationLobbyPlayers.lobbyId, lobby.id)),
          this.db
            .select({ id: teams.id, name: teams.name })
            .from(qualificationLobbyTeams)
            .innerJoin(teams, eq(teams.id, qualificationLobbyTeams.teamId))
            .where(eq(qualificationLobbyTeams.lobbyId, lobby.id)),
          lobby.osuRoomId
            ? this.db
                .select({
                  beatmapId: osuMultiplayerScores.osuBeatmapId,
                  gameId: osuMultiplayerScores.osuGameId,
                  osuUserId: osuMultiplayerScores.osuUserId,
                  userId: users.id,
                  userName: users.osuUsername,
                  score: osuMultiplayerScores.score,
                  mods: osuMultiplayerScores.mods,
                  maxCombo: osuMultiplayerScores.maxCombo,
                  accuracy: osuMultiplayerScores.accuracy,
                  rank: osuMultiplayerScores.rank,
                  great: osuMultiplayerScores.great,
                  ok: osuMultiplayerScores.ok,
                  miss: osuMultiplayerScores.miss,
                })
                .from(osuMultiplayerScores)
                .leftJoin(
                  users,
                  eq(users.osuId, osuMultiplayerScores.osuUserId),
                )
                .where(eq(osuMultiplayerScores.roomId, lobby.osuRoomId))
            : [],
        ]);
        const room = lobby.osuRoomId
          ? await this.db.query.osuMultiplayerRooms.findFirst({
              where: eq(osuMultiplayerRooms.id, lobby.osuRoomId),
            })
          : null;
        const [teamSeats] = selectedTeams.length
          ? await this.db
              .select({ value: count() })
              .from(teamParticipants)
              .where(
                and(
                  inArray(
                    teamParticipants.teamId,
                    selectedTeams.map(({ id }) => id),
                  ),
                  eq(teamParticipants.withdrawn, false),
                ),
              )
          : [{ value: 0 }];
        return {
          ...lobby,
          startsAt: lobby.startsAt.toISOString(),
          endsAt: lobby.endsAt.toISOString(),
          refereeName,
          players,
          teams: selectedTeams,
          seatCount: players.length + (teamSeats?.value ?? 0),
          syncStatus: room?.status ?? null,
          lastSyncedAt: room?.lastSyncedAt?.toISOString() ?? null,
          attempts,
        };
      }),
    );
  }

  public async update(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
    number: number;
    refereeId: UserId;
    startsAt: Date;
    endsAt: Date;
    mpUrl?: string | null;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    await this.assertReferee(input.tournamentId, input.refereeId);
    const osuRoomId = input.mpUrl
      ? await this.syncService.ensureRoom(input.mpUrl)
      : null;
    const { tournamentId: _, lobbyId: __, ...data } = input;
    const [updated] = await this.db
      .update(qualificationLobbies)
      .set({ ...data, osuRoomId })
      .where(eq(qualificationLobbies.id, input.lobbyId))
      .returning();
    await this.results.invalidate(lobby.stageId);
    return updated;
  }

  public async delete(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    const [deleted] = await this.db
      .delete(qualificationLobbies)
      .where(eq(qualificationLobbies.id, input.lobbyId))
      .returning();
    await this.results.invalidate(lobby.stageId);
    return deleted;
  }

  public async start(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    if (!lobby.osuRoomId)
      throw new QualificationLobbyException(
        'Lobby has no osu room',
        QualificationLobbyExceptionCode.LOBBY_ROOM_REQUIRED,
      );
    await this.syncService.sync(lobby.osuRoomId, true);
    await this.results.recalculate(lobby.stageId);
  }

  public async stop(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    if (!lobby.osuRoomId)
      throw new QualificationLobbyException(
        'Lobby has no osu room',
        QualificationLobbyExceptionCode.LOBBY_ROOM_REQUIRED,
      );
    await this.syncService.stop(lobby.osuRoomId);
  }

  public async joinSolo(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
    userId: UserId;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    const participant = await this.db.query.soloParticipants.findFirst({
      where: and(
        eq(soloParticipants.tournamentId, input.tournamentId),
        eq(soloParticipants.userId, input.userId),
        eq(soloParticipants.withdrawn, false),
      ),
    });
    if (!participant)
      throw new QualificationLobbyException(
        'User is not an active tournament participant',
        QualificationLobbyExceptionCode.LOBBY_PARTICIPANT_INACTIVE,
      );
    await this.assertCanParticipate(input.tournamentId, [input.userId]);
    await this.repository.selectSolo({ ...input, stageId: lobby.stageId });
    await this.results.invalidate(lobby.stageId);
  }

  public async joinTeam(input: {
    tournamentId: TournamentId;
    lobbyId: QualificationLobbyId;
    teamId: TeamId;
    userId: UserId;
  }) {
    const lobby = await this.getScoped(input.tournamentId, input.lobbyId);
    const team = await this.db.query.teams.findFirst({
      where: and(
        eq(teams.id, input.teamId),
        eq(teams.tournamentId, input.tournamentId),
        eq(teams.withdrawn, false),
      ),
    });
    if (!team)
      throw new QualificationLobbyException(
        'Team is not an active tournament participant',
        QualificationLobbyExceptionCode.LOBBY_TEAM_INACTIVE,
      );
    if (team.captainId !== input.userId)
      throw new QualificationLobbyException(
        'Only team captain can select a team',
        QualificationLobbyExceptionCode.LOBBY_TEAM_CAPTAIN_REQUIRED,
      );
    const members = await this.db
      .select({ userId: teamParticipants.userId })
      .from(teamParticipants)
      .where(
        and(
          eq(teamParticipants.teamId, input.teamId),
          eq(teamParticipants.withdrawn, false),
        ),
      );
    if (!members.length)
      throw new QualificationLobbyException(
        'Team has no active members',
        QualificationLobbyExceptionCode.LOBBY_TEAM_EMPTY,
      );
    await this.assertCanParticipate(
      input.tournamentId,
      members.map(({ userId }) => userId),
    );
    await this.repository.selectTeam({
      lobbyId: input.lobbyId,
      stageId: lobby.stageId,
      teamId: input.teamId,
      seats: members.length,
    });
    await this.results.invalidate(lobby.stageId);
  }

  private async getScoped(
    tournamentId: TournamentId,
    id: QualificationLobbyId,
  ) {
    const [lobby] = await this.db
      .select({ lobby: qualificationLobbies })
      .from(qualificationLobbies)
      .innerJoin(stages, eq(stages.id, qualificationLobbies.stageId))
      .where(
        and(
          eq(qualificationLobbies.id, id),
          eq(stages.tournamentId, tournamentId),
          eq(stages.type, 'qualification'),
        ),
      )
      .limit(1);
    if (!lobby)
      throw new QualificationLobbyException(
        'Qualification lobby not found',
        QualificationLobbyExceptionCode.LOBBY_NOT_FOUND,
      );
    return lobby.lobby;
  }

  private async assertQualificationStage(
    stageId: StageId,
    tournamentId: TournamentId,
  ) {
    const stage = await this.db.query.stages.findFirst({
      where: and(
        eq(stages.id, stageId),
        eq(stages.tournamentId, tournamentId),
        eq(stages.type, 'qualification'),
      ),
    });
    if (!stage)
      throw new QualificationLobbyException(
        'Stage must be this tournament qualification stage',
        QualificationLobbyExceptionCode.LOBBY_STAGE_INVALID,
      );
  }

  private async assertReferee(tournamentId: TournamentId, refereeId: UserId) {
    const rows = await this.db
      .select({ userId: tournamentStaffMembers.userId })
      .from(tournamentStaffMembers)
      .innerJoin(staffRoles, eq(staffRoles.id, tournamentStaffMembers.roleId))
      .where(
        and(
          eq(tournamentStaffMembers.tournamentId, tournamentId),
          eq(tournamentStaffMembers.userId, refereeId),
          eq(staffRoles.name, 'Referee'),
        ),
      );
    if (!rows.length)
      throw new QualificationLobbyException(
        'Referee must be assigned to the tournament',
        QualificationLobbyExceptionCode.LOBBY_REFEREE_INVALID,
      );
  }

  private async assertCanParticipate(
    tournamentId: TournamentId,
    userIds: UserId[],
  ) {
    const blocked = await this.db
      .select({ userId: tournamentStaffMembers.userId })
      .from(tournamentStaffMembers)
      .innerJoin(staffRoles, eq(staffRoles.id, tournamentStaffMembers.roleId))
      .where(
        and(
          eq(tournamentStaffMembers.tournamentId, tournamentId),
          inArray(tournamentStaffMembers.userId, userIds),
          notInArray(staffRoles.name, ['Commentator', 'Streamer']),
        ),
      );
    if (blocked.length)
      throw new QualificationLobbyException(
        'Only Commentator or Streamer staff may participate',
        QualificationLobbyExceptionCode.LOBBY_STAFF_CANNOT_PARTICIPATE,
      );
  }
}
