import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  mappools,
  mappoolsBeatmaps,
  matches,
  qualificationAttempts,
  Schema,
  soloParticipants,
  stages,
  teamParticipants,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import {
  QualificationRosterInput,
  UpdateQualificationCompetitorInput,
} from './dto';
import { calculateQualificationSeeds as calculateSeeds } from './qualification-seeding';
import {
  TournamentCreateParams,
  TournamentRegisterParams,
  TournamentUpdateParams,
} from './types';

@Injectable()
export class TournamentService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async create(params: TournamentCreateParams): Promise<DbTournament> {
    const id = tournamentId();

    const [created] = await this.drizzle
      .insert(tournaments)
      .values({ id, ...params })
      .returning();

    return created;
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
  ): Promise<DbUser[]> {
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

      return found.map(({ user }) => user);
    }

    const found = await this.drizzle
      .select({ user: users })
      .from(soloParticipants)
      .innerJoin(users, eq(users.id, soloParticipants.userId))
      .where(and(eq(soloParticipants.tournamentId, id), search))
      .limit(limit)
      .offset(offset);

    return found.map(({ user }) => user);
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
          seed: soloParticipants.seed,
          withdrawn: soloParticipants.withdrawn,
          withdrawalReason: soloParticipants.withdrawalReason,
        })
        .from(soloParticipants)
        .innerJoin(users, eq(users.id, soloParticipants.userId))
        .where(eq(soloParticipants.tournamentId, id))
        .orderBy(asc(soloParticipants.seed), asc(users.osuUsername));

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
        teamSeed: teams.seed,
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
      .where(eq(teams.tournamentId, id))
      .orderBy(asc(teams.seed), asc(teams.name), asc(users.osuUsername));

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
      .set(this.qualificationUpdate(data))
      .where(
        and(
          eq(soloParticipants.tournamentId, id),
          eq(soloParticipants.userId, userId),
        ),
      )
      .returning();

    if (!updated) this.throwScopedQualificationNotFound('Participant');
  }

  public async updateQualificationTeam(params: {
    id: TournamentId;
    teamId: TeamId;
    data: UpdateQualificationCompetitorInput;
  }): Promise<void> {
    const { id, teamId, data } = params;
    const [updated] = await this.drizzle
      .update(teams)
      .set(this.qualificationUpdate(data))
      .where(and(eq(teams.tournamentId, id), eq(teams.id, teamId)))
      .returning();

    if (!updated) this.throwScopedQualificationNotFound('Team');
  }

  public async updateQualificationTeamParticipant(params: {
    id: TournamentId;
    teamId: TeamId;
    userId: UserId;
    data: Omit<UpdateQualificationCompetitorInput, 'seed'>;
  }): Promise<void> {
    const { id, teamId, userId, data } = params;
    const [updated] = await this.drizzle
      .update(teamParticipants)
      .set(this.qualificationUpdate(data))
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

    if (!updated) this.throwScopedQualificationNotFound('Team participant');
  }

  public async calculateQualificationSeeds(params: {
    id: TournamentId;
  }): Promise<QualificationRosterInput> {
    const { id } = params;

    await this.drizzle.transaction(async (tx) => {
      const tournament = await tx.query.tournaments.findFirst({
        where: and(eq(tournaments.id, id), isNull(tournaments.deletedAt)),
      });
      if (!tournament) {
        throw new TournamentException(
          'Tournament not found',
          TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
        );
      }

      const stage = await tx.query.stages.findFirst({
        where: and(
          eq(stages.tournamentId, id),
          eq(stages.type, 'qualification'),
          isNull(stages.deletedAt),
        ),
      });
      if (!stage) {
        throw new BadRequestException('Qualification stage not found');
      }

      const beatmaps = await tx
        .select({ beatmapId: mappoolsBeatmaps.beatmapId })
        .from(mappoolsBeatmaps)
        .innerJoin(mappools, eq(mappools.id, mappoolsBeatmaps.mappoolId))
        .where(eq(mappools.stageId, stage.id));
      if (beatmaps.length === 0) {
        throw new BadRequestException('Qualification mappool is empty');
      }

      const attempts = await tx
        .select({
          osuGameId: qualificationAttempts.osuGameId,
          beatmapId: qualificationAttempts.beatmapId,
          userId: qualificationAttempts.userId,
          score: qualificationAttempts.score,
        })
        .from(qualificationAttempts)
        .innerJoin(matches, eq(matches.id, qualificationAttempts.matchId))
        .where(eq(matches.stageId, stage.id));

      const beatmapIds = beatmaps.map(({ beatmapId }) => beatmapId);
      if (!tournament.isTeam) {
        const competitors = await tx
          .select({
            id: soloParticipants.userId,
            userId: soloParticipants.userId,
            osuId: users.osuId,
          })
          .from(soloParticipants)
          .innerJoin(users, eq(users.id, soloParticipants.userId))
          .where(
            and(
              eq(soloParticipants.tournamentId, id),
              eq(soloParticipants.withdrawn, false),
            ),
          );
        const seeds = calculateSeeds({
          beatmapIds,
          competitors: competitors.map((competitor) => ({
            id: competitor.id,
            tieBreakId: competitor.osuId,
            userIds: [competitor.userId],
          })),
          attempts,
        });

        await tx
          .update(soloParticipants)
          .set({ seed: null })
          .where(eq(soloParticipants.tournamentId, id));
        for (const seed of seeds) {
          await tx
            .update(soloParticipants)
            .set({ seed: seed.seed })
            .where(
              and(
                eq(soloParticipants.tournamentId, id),
                eq(soloParticipants.userId, seed.competitorId as UserId),
              ),
            );
        }
        return;
      }

      const members = await tx
        .select({
          teamId: teams.id,
          userId: teamParticipants.userId,
        })
        .from(teams)
        .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
        .where(and(eq(teams.tournamentId, id), eq(teams.withdrawn, false)));
      const membersByTeam = new Map<TeamId, UserId[]>();
      for (const member of members) {
        const userIds = membersByTeam.get(member.teamId) ?? [];
        userIds.push(member.userId);
        membersByTeam.set(member.teamId, userIds);
      }
      const seeds = calculateSeeds({
        beatmapIds,
        competitors: [...membersByTeam].map(([teamId, userIds]) => ({
          id: teamId,
          tieBreakId: teamId,
          userIds,
        })),
        attempts,
      });

      await tx
        .update(teams)
        .set({ seed: null })
        .where(eq(teams.tournamentId, id));
      for (const seed of seeds) {
        await tx
          .update(teams)
          .set({ seed: seed.seed })
          .where(
            and(
              eq(teams.tournamentId, id),
              eq(teams.id, seed.competitorId as TeamId),
            ),
          );
      }
    });

    return this.getQualificationRoster({ id });
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
        captainId: teams.captainId,
        user: users,
      })
      .from(teams)
      .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
      .innerJoin(users, eq(users.id, teamParticipants.userId))
      .where(eq(teams.tournamentId, id))
      .orderBy(asc(teams.name), asc(users.osuUsername));

    const byTeam = new Map<
      TeamId,
      { id: TeamId; name: string; captainId: UserId; participants: DbUser[] }
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
        captainId: row.captainId,
        participants: [row.user],
      });
    }

    return [...byTeam.values()];
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
      throw new BadRequestException('endsAt must be greater than startsAt');
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
      throw new BadRequestException('Archived tournaments cannot be changed');
    }
  }

  private qualificationUpdate(data: UpdateQualificationCompetitorInput) {
    return {
      ...data,
      withdrawalReason: data.withdrawn === false ? null : data.withdrawalReason,
    };
  }

  private throwScopedQualificationNotFound(subject: string): never {
    throw new TournamentException(
      `${subject} not found in tournament`,
      TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
    );
  }
}
