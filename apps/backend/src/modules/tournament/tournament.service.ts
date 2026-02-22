import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import { teamId } from 'lib/domain/team/team.id';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import {
  TournamentId,
  tournamentId,
} from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  DbTournament,
  DbUser,
  Schema,
  soloParticipants,
  teamParticipants,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
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

  public async findMany(params: PaginationParams): Promise<DbTournament[]> {
    const { limit, offset } = params;

    const found = await this.drizzle.query.tournaments.findMany({
      where: isNull(tournaments.deletedAt),
      limit,
      offset,
    });

    return found;
  }

  public async getParticipants(
    params: { id: TournamentId } & PaginationParams,
  ): Promise<DbUser[]> {
    const { id, limit, offset } = params;

    const tournament = await this.getById({ id });

    if (tournament.isTeam) {
      const found = await this.drizzle
        .select({ user: users })
        .from(teamParticipants)
        .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
        .innerJoin(users, eq(users.id, teamParticipants.userId))
        .where(eq(teams.tournamentId, id))
        .limit(limit)
        .offset(offset);

      return found.map(({ user }) => user);
    }

    const found = await this.drizzle
      .select({ user: users })
      .from(soloParticipants)
      .innerJoin(users, eq(users.id, soloParticipants.userId))
      .where(eq(soloParticipants.tournamentId, id))
      .limit(limit)
      .offset(offset);

    return found.map(({ user }) => user);
  }

  public async getTeams(params: { id: TournamentId }): Promise<
    {
      id: string;
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
      string,
      { id: string; name: string; captainId: UserId; participants: DbUser[] }
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

  public async update(params: {
    id: TournamentId;
    data: TournamentUpdateParams;
  }): Promise<DbTournament> {
    const {
      id,
      data: { startsAt, endsAt, ...rest },
    } = params;

    const current = await this.getById({ id });
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
      .where(and(eq(tournaments.id, id), isNull(tournaments.deletedAt)))
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
      .where(and(eq(tournaments.id, id), isNull(tournaments.deletedAt)))
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
}
