import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
} from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import { StaffRoleId } from 'lib/domain/staff-role/staff-role.id';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { TeamId, teamId } from 'lib/domain/team/team.id';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import {
  TournamentId,
  tournamentId,
} from 'lib/domain/tournament/tournament.id';
import { TournamentMode } from 'lib/domain/tournament/tournament.mode';
import { UserId } from 'lib/domain/user/user.id';
import {
  DbTournament,
  DbUser,
  qualificationResults,
  Schema,
  soloParticipants,
  staffRoles,
  stages,
  teamParticipants,
  teams,
  tournaments,
  tournamentStaffMembers,
  users,
} from 'lib/infrastructure/db';
import { QualificationLobbyRepository } from 'modules/qualification/qualification-lobby.repository';
import { QualificationResultsService } from 'modules/qualification/qualification-results.service';
import {
  QualificationRosterInput,
  type TournamentStaffRoleDto,
  UpdateQualificationCompetitorInput,
} from './dto';
import {
  TournamentCreateParams,
  TournamentRegisterParams,
  TournamentUpdateParams,
} from './types';

@Injectable()
export class TournamentService {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly qualificationResults: QualificationResultsService,
    private readonly qualificationLobbies: QualificationLobbyRepository,
  ) {}

  public async create(params: TournamentCreateParams): Promise<DbTournament> {
    const id = tournamentId();
    return this.drizzle.transaction(async (tx) => {
      const [created] = await tx
        .insert(tournaments)
        .values({ id, ...params })
        .returning();
      const host = await tx.query.staffRoles.findFirst({
        where: eq(staffRoles.name, 'Host'),
      });
      if (!host) throw new Error('Host staff role is missing');
      await tx.insert(tournamentStaffMembers).values({
        tournamentId: id,
        roleId: host.id,
        userId: params.creatorId,
      });
      return created;
    });
  }

  public async getById(params: { id: TournamentId }): Promise<DbTournament> {
    const { id } = params;

    const tournament = await this.drizzle.query.tournaments.findFirst({
      where: and(eq(tournaments.id, id), isNull(tournaments.deletedAt)),
    });

    if (!tournament) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return tournament;
  }

  public async findMany(
    params: PaginationParams & {
      mode?: TournamentMode;
      status?: 'active' | 'archived';
    },
  ): Promise<DbTournament[]> {
    const { limit, offset, mode, status = 'active' } = params;
    const archiveFilter =
      status === 'archived'
        ? isNotNull(tournaments.archivedAt)
        : isNull(tournaments.archivedAt);

    const found = await this.drizzle.query.tournaments.findMany({
      where: mode
        ? and(
            isNull(tournaments.deletedAt),
            archiveFilter,
            eq(tournaments.mode, mode),
          )
        : and(isNull(tournaments.deletedAt), archiveFilter),
      orderBy: asc(tournaments.startsAt),
      limit,
      offset,
    });

    return found;
  }

  public async archive(params: {
    id: TournamentId;
    archivedAt?: Date;
  }): Promise<DbTournament> {
    const { id, archivedAt = new Date() } = params;

    const [archived] = await this.drizzle
      .update(tournaments)
      .set({ archivedAt })
      .where(
        and(
          eq(tournaments.id, id),
          isNull(tournaments.archivedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .returning();

    if (!archived) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return archived;
  }

  public async getParticipants(
    params: { id: TournamentId; query?: string } & PaginationParams,
  ): Promise<(DbUser & { seed: number | null })[]> {
    const { id, limit, offset, query } = params;

    const tournament = await this.getById({ id });
    const parsedOsuId = Number(query);
    const search = query
      ? Number.isInteger(parsedOsuId)
        ? or(
            ilike(users.osuUsername, `%${query}%`),
            eq(users.osuId, parsedOsuId),
          )
        : ilike(users.osuUsername, `%${query}%`)
      : undefined;

    if (tournament.isTeam) {
      const found = await this.drizzle
        .select({ user: users })
        .from(teamParticipants)
        .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
        .innerJoin(users, eq(users.id, teamParticipants.userId))
        .where(and(eq(teams.tournamentId, id), search))
        .limit(limit)
        .offset(offset);

      return found.map(({ user }) => ({ ...user, seed: null }));
    }

    const found = await this.drizzle
      .select({ user: users, seed: qualificationResults.seed })
      .from(soloParticipants)
      .innerJoin(users, eq(users.id, soloParticipants.userId))
      .leftJoin(
        stages,
        and(
          eq(stages.tournamentId, soloParticipants.tournamentId),
          eq(stages.type, 'qualification'),
        ),
      )
      .leftJoin(
        qualificationResults,
        and(
          eq(qualificationResults.stageId, stages.id),
          eq(qualificationResults.userId, soloParticipants.userId),
        ),
      )
      .where(and(eq(soloParticipants.tournamentId, id), search))
      .orderBy(asc(qualificationResults.seed), asc(users.osuUsername))
      .limit(limit)
      .offset(offset);

    return found.map(({ user, seed }) => ({ ...user, seed }));
  }

  public async getStaff(params: {
    id: TournamentId;
  }): Promise<InstanceType<typeof TournamentStaffRoleDto>[]> {
    await this.getById({ id: params.id });
    const rows = await this.drizzle
      .select({
        roleId: staffRoles.id,
        roleName: staffRoles.name,
        canParticipate: staffRoles.canParticipate,
        user: users,
      })
      .from(staffRoles)
      .leftJoin(
        tournamentStaffMembers,
        and(
          eq(tournamentStaffMembers.roleId, staffRoles.id),
          eq(tournamentStaffMembers.tournamentId, params.id),
        ),
      )
      .leftJoin(users, eq(users.id, tournamentStaffMembers.userId))
      .orderBy(asc(staffRoles.name), asc(users.osuUsername));
    const result = new Map<
      StaffRoleId,
      {
        id: StaffRoleId;
        name: string;
        canParticipate: boolean;
        members: DbUser[];
      }
    >();
    for (const row of rows) {
      const role = result.get(row.roleId) ?? {
        id: row.roleId,
        name: row.roleName,
        canParticipate: row.canParticipate,
        members: [],
      };
      if (row.user) role.members.push(row.user);
      result.set(row.roleId, role);
    }
    return [...result.values()];
  }

  public async assignStaff(params: {
    id: TournamentId;
    roleId: StaffRoleId;
    userId: UserId;
  }) {
    await this.getById({ id: params.id });
    await this.drizzle.insert(tournamentStaffMembers).values({
      tournamentId: params.id,
      roleId: params.roleId,
      userId: params.userId,
    });
  }

  public async removeStaff(params: {
    id: TournamentId;
    roleId: StaffRoleId;
    userId: UserId;
  }) {
    const [removed] = await this.drizzle
      .delete(tournamentStaffMembers)
      .where(
        and(
          eq(tournamentStaffMembers.tournamentId, params.id),
          eq(tournamentStaffMembers.roleId, params.roleId),
          eq(tournamentStaffMembers.userId, params.userId),
        ),
      )
      .returning();
    if (!removed)
      throw new TournamentException(
        'Staff assignment not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
  }

  public async getQualificationRoster(params: {
    id: TournamentId;
  }): Promise<QualificationRosterInput> {
    const { id } = params;
    const tournament = await this.getById({ id });

    if (!tournament.isTeam) {
      const participants = await this.drizzle
        .select({
          id: users.id,
          osuId: users.osuId,
          osuUsername: users.osuUsername,
          seed: qualificationResults.seed,
          withdrawn: soloParticipants.withdrawn,
          withdrawalReason: soloParticipants.withdrawalReason,
        })
        .from(soloParticipants)
        .innerJoin(users, eq(users.id, soloParticipants.userId))
        .innerJoin(
          stages,
          and(
            eq(stages.tournamentId, soloParticipants.tournamentId),
            eq(stages.type, 'qualification'),
          ),
        )
        .leftJoin(
          qualificationResults,
          and(
            eq(qualificationResults.stageId, stages.id),
            eq(qualificationResults.userId, soloParticipants.userId),
          ),
        )
        .where(eq(soloParticipants.tournamentId, id))
        .orderBy(asc(qualificationResults.seed), asc(users.osuUsername));

      return {
        kind: 'solo',
        participants: participants.map((participant) => ({
          ...participant,
          avatarUrl: `https://a.ppy.sh/${participant.osuId}`,
        })),
      };
    }

    const rows = await this.drizzle
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamSeed: qualificationResults.seed,
        teamWithdrawn: teams.withdrawn,
        teamWithdrawalReason: teams.withdrawalReason,
        id: users.id,
        osuId: users.osuId,
        osuUsername: users.osuUsername,
        withdrawn: teamParticipants.withdrawn,
        withdrawalReason: teamParticipants.withdrawalReason,
      })
      .from(teams)
      .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
      .innerJoin(users, eq(users.id, teamParticipants.userId))
      .innerJoin(
        stages,
        and(
          eq(stages.tournamentId, teams.tournamentId),
          eq(stages.type, 'qualification'),
        ),
      )
      .leftJoin(
        qualificationResults,
        and(
          eq(qualificationResults.stageId, stages.id),
          eq(qualificationResults.teamId, teams.id),
        ),
      )
      .where(eq(teams.tournamentId, id))
      .orderBy(
        asc(qualificationResults.seed),
        asc(teams.name),
        asc(users.osuUsername),
      );

    const managedTeams = new Map<
      TeamId,
      Extract<QualificationRosterInput, { kind: 'team' }>['teams'][number]
    >();
    for (const row of rows) {
      const participant = {
        id: row.id,
        osuId: row.osuId,
        osuUsername: row.osuUsername,
        avatarUrl: `https://a.ppy.sh/${row.osuId}`,
        withdrawn: row.withdrawn,
        withdrawalReason: row.withdrawalReason,
      };
      const team = managedTeams.get(row.teamId);
      if (team) {
        team.participants.push(participant);
      } else {
        managedTeams.set(row.teamId, {
          id: row.teamId,
          name: row.teamName,
          seed: row.teamSeed,
          withdrawn: row.teamWithdrawn,
          withdrawalReason: row.teamWithdrawalReason,
          participants: [participant],
        });
      }
    }

    return { kind: 'team', teams: [...managedTeams.values()] };
  }

  public async updateSoloQualificationParticipant(params: {
    id: TournamentId;
    userId: UserId;
    data: UpdateQualificationCompetitorInput;
  }): Promise<void> {
    const { id, userId, data } = params;
    const [updated] = await this.drizzle
      .update(soloParticipants)
      .set({
        ...data,
        withdrawalReason:
          data.withdrawn === false ? null : data.withdrawalReason,
      })
      .where(
        and(
          eq(soloParticipants.tournamentId, id),
          eq(soloParticipants.userId, userId),
        ),
      )
      .returning();

    if (!updated)
      throw new TournamentException(
        'Participant not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    await this.invalidateQualification(id);
  }

  public async removeSoloParticipant(params: {
    id: TournamentId;
    userId: UserId;
  }): Promise<void> {
    const { id, userId } = params;
    const [removed] = await this.drizzle
      .delete(soloParticipants)
      .where(
        and(
          eq(soloParticipants.tournamentId, id),
          eq(soloParticipants.userId, userId),
        ),
      )
      .returning();

    if (!removed)
      throw new TournamentException(
        'Participant not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    await this.invalidateQualification(id);
  }

  public async updateQualificationTeam(params: {
    id: TournamentId;
    teamId: TeamId;
    data: UpdateQualificationCompetitorInput;
  }): Promise<void> {
    const { id, teamId, data } = params;
    const [updated] = await this.drizzle
      .update(teams)
      .set({
        ...data,
        withdrawalReason:
          data.withdrawn === false ? null : data.withdrawalReason,
      })
      .where(and(eq(teams.tournamentId, id), eq(teams.id, teamId)))
      .returning();

    if (!updated)
      throw new TournamentException(
        'Team not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    await this.invalidateQualification(id);
  }

  public async removeTeam(params: {
    id: TournamentId;
    teamId: TeamId;
  }): Promise<void> {
    const { id, teamId } = params;
    const [removed] = await this.drizzle
      .delete(teams)
      .where(and(eq(teams.tournamentId, id), eq(teams.id, teamId)))
      .returning();

    if (!removed)
      throw new TournamentException(
        'Team not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    await this.invalidateQualification(id);
  }

  public async updateQualificationTeamParticipant(params: {
    id: TournamentId;
    teamId: TeamId;
    userId: UserId;
    data: UpdateQualificationCompetitorInput;
  }): Promise<void> {
    const { id, teamId, userId, data } = params;
    if (data.withdrawn === false) {
      await this.drizzle.transaction(async (tx) => {
        const stage = await tx.query.stages.findFirst({
          where: and(
            eq(stages.tournamentId, id),
            eq(stages.type, 'qualification'),
            isNull(stages.deletedAt),
          ),
        });
        if (!stage)
          throw new StageException(
            'Qualification stage not found',
            StageExceptionCode.STAGE_NOT_FOUND,
          );
        const [updated] = await tx
          .update(teamParticipants)
          .set({ ...data, withdrawalReason: null })
          .from(teams)
          .where(
            and(
              eq(teamParticipants.teamId, teamId),
              eq(teamParticipants.userId, userId),
              eq(teams.id, teamParticipants.teamId),
              eq(teams.tournamentId, id),
            ),
          )
          .returning();
        if (!updated)
          throw new TournamentException(
            'Team participant not found in tournament',
            TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
          );
        await this.qualificationLobbies.assertAssignedTeamCapacity(
          tx as Schema,
          stage.id,
          teamId,
        );
      });
      await this.invalidateQualification(id);
      return;
    }
    const [updated] = await this.drizzle
      .update(teamParticipants)
      .set({
        ...data,
        withdrawalReason: data.withdrawalReason,
      })
      .from(teams)
      .where(
        and(
          eq(teamParticipants.teamId, teamId),
          eq(teamParticipants.userId, userId),
          eq(teams.id, teamParticipants.teamId),
          eq(teams.tournamentId, id),
        ),
      )
      .returning();

    if (!updated)
      throw new TournamentException(
        'Team participant not found in tournament',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    await this.invalidateQualification(id);
  }

  public async searchTeams(
    params: { id: TournamentId; query?: string } & PaginationParams,
  ): Promise<{ id: TeamId; name: string }[]> {
    const { id, query, limit, offset } = params;
    const tournament = await this.getById({ id });
    if (!tournament.isTeam) return [];

    return this.drizzle
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(
        and(
          eq(teams.tournamentId, id),
          query ? ilike(teams.name, `%${query}%`) : undefined,
        ),
      )
      .orderBy(asc(teams.name))
      .limit(limit)
      .offset(offset);
  }

  public async getTeams(params: { id: TournamentId }): Promise<
    {
      id: TeamId;
      name: string;
      seed: number | null;
      captainId: UserId;
      participants: DbUser[];
    }[]
  > {
    const { id } = params;

    const tournament = await this.getById({ id });
    if (!tournament.isTeam) return [];

    const rows = await this.drizzle
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamSeed: qualificationResults.seed,
        captainId: teams.captainId,
        user: users,
      })
      .from(teams)
      .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
      .innerJoin(users, eq(users.id, teamParticipants.userId))
      .leftJoin(
        stages,
        and(
          eq(stages.tournamentId, teams.tournamentId),
          eq(stages.type, 'qualification'),
        ),
      )
      .leftJoin(
        qualificationResults,
        and(
          eq(qualificationResults.stageId, stages.id),
          eq(qualificationResults.teamId, teams.id),
        ),
      )
      .where(eq(teams.tournamentId, id))
      .orderBy(asc(teams.name), asc(users.osuUsername));

    const byTeam = new Map<
      TeamId,
      {
        id: TeamId;
        name: string;
        seed: number | null;
        captainId: UserId;
        participants: DbUser[];
      }
    >();

    for (const row of rows) {
      const current = byTeam.get(row.teamId);
      if (current) {
        current.participants.push(row.user);
        continue;
      }

      byTeam.set(row.teamId, {
        id: row.teamId,
        name: row.teamName,
        seed: row.teamSeed,
        captainId: row.captainId,
        participants: [row.user],
      });
    }

    return [...byTeam.values()]
      .sort(
        (left, right) =>
          (left.seed ?? Number.POSITIVE_INFINITY) -
            (right.seed ?? Number.POSITIVE_INFINITY) ||
          left.name.localeCompare(right.name),
      )
      .map(({ id, name, seed, captainId, participants }) => ({
        id,
        name,
        seed,
        captainId,
        participants,
      }));
  }

  public async getParticipantsCount(params: {
    id: TournamentId;
    isTeam: boolean;
  }): Promise<number> {
    const { id, isTeam } = params;

    if (isTeam) {
      const [row] = await this.drizzle
        .select({ participantsCount: count(teamParticipants.userId) })
        .from(teamParticipants)
        .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
        .where(eq(teams.tournamentId, id));

      return row?.participantsCount ?? 0;
    }

    const [row] = await this.drizzle
      .select({ participantsCount: count(soloParticipants.userId) })
      .from(soloParticipants)
      .where(eq(soloParticipants.tournamentId, id));

    return row?.participantsCount ?? 0;
  }

  public async getParticipantsCountMap(
    tournamentIds: TournamentId[],
  ): Promise<Map<TournamentId, number>> {
    const counts = new Map<TournamentId, number>();

    if (tournamentIds.length === 0) {
      return counts;
    }

    const [soloRows, teamRows] = await Promise.all([
      this.drizzle
        .select({
          tournamentId: soloParticipants.tournamentId,
          participantsCount: count(soloParticipants.userId),
        })
        .from(soloParticipants)
        .where(inArray(soloParticipants.tournamentId, tournamentIds))
        .groupBy(soloParticipants.tournamentId),
      this.drizzle
        .select({
          tournamentId: teams.tournamentId,
          participantsCount: count(teamParticipants.userId),
        })
        .from(teams)
        .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
        .where(inArray(teams.tournamentId, tournamentIds))
        .groupBy(teams.tournamentId),
    ]);

    for (const row of soloRows) {
      counts.set(row.tournamentId, row.participantsCount);
    }

    for (const row of teamRows) {
      counts.set(row.tournamentId, row.participantsCount);
    }

    return counts;
  }

  public async update(params: {
    id: TournamentId;
    data: TournamentUpdateParams;
  }): Promise<DbTournament> {
    const {
      id,
      data: { startsAt, endsAt, ...rest },
    } = params;

    const current = await this.getById({ id });
    this.assertMutable(current);
    const nextStartsAt = startsAt ?? current.startsAt;
    const nextEndsAt = endsAt ?? current.endsAt;

    if (nextEndsAt <= nextStartsAt) {
      throw new TournamentException(
        'endsAt must be greater than startsAt',
        TournamentExceptionCode.TOURNAMENT_INVALID_DATES,
      );
    }

    const [updated] = await this.drizzle
      .update(tournaments)
      .set({
        ...rest,
        startsAt,
        endsAt,
      })
      .where(
        and(
          eq(tournaments.id, id),
          isNull(tournaments.archivedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return updated;
  }

  public async softDelete(params: { id: TournamentId }): Promise<DbTournament> {
    const { id } = params;

    const [deleted] = await this.drizzle
      .update(tournaments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(tournaments.id, id),
          isNull(tournaments.archivedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return deleted;
  }

  public async register(params: {
    id: TournamentId;
    userId: UserId;
    data: TournamentRegisterParams;
  }): Promise<void> {
    const { id, userId, data } = params;

    const tournament = await this.getById({ id });
    this.assertMutable(tournament);
    if (!tournament.registrationOpen) {
      throw new TournamentException(
        'Tournament registration is closed',
        TournamentExceptionCode.TOURNAMENT_REGISTRATION_CLOSED,
      );
    }

    await this.assertCanParticipate({
      tournamentId: id,
      userIds: tournament.isTeam
        ? Array.from(
            new Set<UserId>([userId, ...(data.team?.participants ?? [])]),
          )
        : [userId],
    });

    if (tournament.isTeam) {
      await this.registerTeam({ tournamentId: id, captainId: userId, data });
      return;
    }

    await this.registerSolo({ tournamentId: id, userId, data });
  }

  public async unregister(params: {
    id: TournamentId;
    userId: UserId;
  }): Promise<void> {
    const { id, userId } = params;

    const tournament = await this.getById({ id });
    this.assertMutable(tournament);
    if (!tournament.registrationOpen) {
      throw new TournamentException(
        'Tournament registration is closed',
        TournamentExceptionCode.TOURNAMENT_REGISTRATION_CLOSED,
      );
    }

    if (tournament.isTeam) {
      await this.unregisterTeam({ tournamentId: id, userId });
      return;
    }

    await this.unregisterSolo({ tournamentId: id, userId });
  }

  private async registerTeam(params: {
    tournamentId: TournamentId;
    captainId: UserId;
    data: TournamentRegisterParams;
  }): Promise<void> {
    const { tournamentId, captainId, data } = params;

    if (!data.team) {
      throw new TournamentException(
        'Team payload is required for team tournaments',
        TournamentExceptionCode.TOURNAMENT_INVALID_REGISTRATION_MODE,
      );
    }

    const existingTeamWithName = await this.drizzle.query.teams.findFirst({
      where: and(
        eq(teams.tournamentId, tournamentId),
        eq(teams.name, data.team.name),
      ),
    });

    if (existingTeamWithName) {
      throw new TournamentException(
        'Team name is already registered in this tournament',
        TournamentExceptionCode.TOURNAMENT_TEAM_NAME_TAKEN,
      );
    }

    const participantIds = Array.from(
      new Set<UserId>([...data.team.participants, captainId]),
    );

    const conflictingParticipant = await this.drizzle
      .select({ userId: teamParticipants.userId })
      .from(teamParticipants)
      .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
      .where(
        and(
          eq(teams.tournamentId, tournamentId),
          inArray(teamParticipants.userId, participantIds),
        ),
      )
      .limit(1);

    if (conflictingParticipant.length > 0) {
      throw new TournamentException(
        'One of participants is already in another team of this tournament',
        TournamentExceptionCode.TOURNAMENT_PARTICIPANT_ALREADY_IN_TEAM,
      );
    }

    await this.drizzle.transaction(async (tx) => {
      const id = teamId();

      await tx.insert(teams).values({
        id,
        name: data.team!.name,
        captainId,
        tournamentId,
      });

      await tx.insert(teamParticipants).values(
        participantIds.map((participantId) => ({
          teamId: id,
          userId: participantId,
        })),
      );
    });
  }

  private async assertCanParticipate(params: {
    tournamentId: TournamentId;
    userIds: UserId[];
  }) {
    const blocked = await this.drizzle
      .select({ userId: tournamentStaffMembers.userId })
      .from(tournamentStaffMembers)
      .innerJoin(staffRoles, eq(staffRoles.id, tournamentStaffMembers.roleId))
      .where(
        and(
          eq(tournamentStaffMembers.tournamentId, params.tournamentId),
          inArray(tournamentStaffMembers.userId, params.userIds),
          eq(staffRoles.canParticipate, false),
        ),
      )
      .limit(1);
    if (blocked.length) {
      throw new TournamentException(
        'Tournament staff with this role cannot participate',
        TournamentExceptionCode.TOURNAMENT_STAFF_CANNOT_PARTICIPATE,
      );
    }
  }

  private async registerSolo(params: {
    tournamentId: TournamentId;
    userId: UserId;
    data: TournamentRegisterParams;
  }): Promise<void> {
    const { tournamentId, userId, data } = params;

    if (data.team) {
      throw new TournamentException(
        'Team payload is not allowed for solo tournaments',
        TournamentExceptionCode.TOURNAMENT_INVALID_REGISTRATION_MODE,
      );
    }

    const existing = await this.drizzle.query.soloParticipants.findFirst({
      where: and(
        eq(soloParticipants.tournamentId, tournamentId),
        eq(soloParticipants.userId, userId),
      ),
    });

    if (existing) {
      throw new TournamentException(
        'User is already registered in this tournament',
        TournamentExceptionCode.TOURNAMENT_ALREADY_REGISTERED,
      );
    }

    await this.drizzle.insert(soloParticipants).values({
      tournamentId,
      userId,
    });
  }

  private async unregisterTeam(params: {
    tournamentId: TournamentId;
    userId: UserId;
  }): Promise<void> {
    const { tournamentId, userId } = params;

    const teamAsCaptain = await this.drizzle.query.teams.findFirst({
      where: and(
        eq(teams.tournamentId, tournamentId),
        eq(teams.captainId, userId),
      ),
    });

    if (!teamAsCaptain) {
      const participation = await this.drizzle
        .select({ userId: teamParticipants.userId })
        .from(teamParticipants)
        .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
        .where(
          and(
            eq(teams.tournamentId, tournamentId),
            eq(teamParticipants.userId, userId),
          ),
        )
        .limit(1);

      if (participation.length > 0) {
        throw new TournamentException(
          'Only team captain can unregister team',
          TournamentExceptionCode.TOURNAMENT_ACCESS_DENIED,
        );
      }

      throw new TournamentException(
        'Registered team not found for this user',
        TournamentExceptionCode.TOURNAMENT_REGISTRATION_NOT_FOUND,
      );
    }

    await this.drizzle.delete(teams).where(eq(teams.id, teamAsCaptain.id));
  }

  private async unregisterSolo(params: {
    tournamentId: TournamentId;
    userId: UserId;
  }): Promise<void> {
    const { tournamentId, userId } = params;

    const [deleted] = await this.drizzle
      .delete(soloParticipants)
      .where(
        and(
          eq(soloParticipants.tournamentId, tournamentId),
          eq(soloParticipants.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new TournamentException(
        'User is not registered in this tournament',
        TournamentExceptionCode.TOURNAMENT_REGISTRATION_NOT_FOUND,
      );
    }
  }

  private assertMutable(tournament: Pick<DbTournament, 'archivedAt'>): void {
    if (tournament.archivedAt) {
      throw new TournamentException(
        'Archived tournaments cannot be changed',
        TournamentExceptionCode.TOURNAMENT_ARCHIVED,
      );
    }
  }

  private async invalidateQualification(tournamentId: TournamentId) {
    const stage = await this.drizzle.query.stages.findFirst({
      where: and(
        eq(stages.tournamentId, tournamentId),
        eq(stages.type, 'qualification'),
        isNull(stages.deletedAt),
      ),
    });
    if (stage) await this.qualificationResults.invalidate(stage.id);
  }
}
