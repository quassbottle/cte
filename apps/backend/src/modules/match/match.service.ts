import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import {
  MatchException,
  MatchExceptionCode,
} from 'lib/domain/match/match.exception';
import { MatchId, matchId } from 'lib/domain/match/match.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  DbMatch,
  DbMatchParticipant,
  DbUser,
  matches,
  matchParticipants,
  matchStaff,
  Schema,
  soloParticipants,
  stages,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import { MatchSyncRepository } from 'modules/match-sync/match-sync.repository';
import { ScheduleMatchUpsertInput } from './dto';
import { MatchCreateParams, ScheduleMatchCreateParams } from './types';

@Injectable()
export class MatchService {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly matchSyncRepository: MatchSyncRepository,
  ) {}

  async create(data: MatchCreateParams): Promise<DbMatch> {
    const id = matchId();

    const [match] = await this.drizzle
      .insert(matches)
      .values({ id, ...data })
      .returning();

    return match;
  }

  async createScheduleMatch(params: {
    tournamentId: TournamentId;
    data: ScheduleMatchCreateParams;
  }): Promise<DbMatch> {
    const { tournamentId, data } = params;

    await this.assertStageBelongsToTournament({
      stageId: data.stageId,
      tournamentId,
    });
    await this.assertMatchCompetitors(tournamentId, data);

    const id = matchId();

    const created = await this.drizzle.transaction(async (tx) => {
      const [match] = await tx
        .insert(matches)
        .values({
          id,
          name: data.name,
          stageId: data.stageId,
          matchNumber: data.matchNumber ?? null,
          creatorId: data.creatorId,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          mpUrl: data.mpUrl,
          vodUrl: data.vodUrl,
          redTeamId: data.redTeamId,
          blueTeamId: data.blueTeamId,
          redScore: data.redScore,
          blueScore: data.blueScore,
        })
        .returning();

      await this.replaceParticipants(tx, id, data.players);
      await this.replaceStaff(tx, id, data.staff);
      if (data.mpUrl)
        await this.matchSyncRepository.activate(id, data.mpUrl, tx);

      return match;
    });

    return created;
  }

  async updateScheduleMatch(params: {
    tournamentId: TournamentId;
    matchId: MatchId;
    data: ScheduleMatchUpsertInput;
  }): Promise<DbMatch> {
    const { tournamentId, matchId: id, data } = params;

    const sync = await this.matchSyncRepository.getState(id);
    if (sync?.status === 'active' && this.hasManualScore(data)) {
      throw new MatchException(
        'Manual score changes are unavailable while match sync is active',
        MatchExceptionCode.MATCH_SYNC_ACTIVE,
      );
    }

    await this.assertStageBelongsToTournament({
      stageId: data.stageId,
      tournamentId,
    });
    await this.assertMatchBelongsToTournament({ matchId: id, tournamentId });
    await this.assertMatchCompetitors(tournamentId, data);

    const current = await this.getById({ id });
    const updated = await this.drizzle.transaction(async (tx) => {
      const [match] = await tx
        .update(matches)
        .set({
          name: data.name,
          stageId: data.stageId,
          matchNumber: data.matchNumber ?? null,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          mpUrl: data.mpUrl,
          vodUrl: data.vodUrl,
          redTeamId: data.redTeamId,
          blueTeamId: data.blueTeamId,
          redScore: data.redScore,
          blueScore: data.blueScore,
        })
        .where(eq(matches.id, id))
        .returning();

      if (!match) {
        throw new MatchException(
          `Match not found`,
          MatchExceptionCode.MATCH_NOT_FOUND,
        );
      }

      await this.replaceParticipants(tx, id, data.players);
      await this.replaceStaff(tx, id, data.staff);
      if (sync && this.hasManualScore(data)) {
        await this.matchSyncRepository.invalidateLease(id, tx);
      }
      if (data.mpUrl && data.mpUrl !== current.mpUrl) {
        await this.matchSyncRepository.activate(id, data.mpUrl, tx);
      } else if (!data.mpUrl && current.mpUrl) {
        await this.matchSyncRepository.stop(id, tx);
      }

      return match;
    });

    return updated;
  }

  async deleteScheduleMatch(params: {
    tournamentId: TournamentId;
    matchId: MatchId;
  }): Promise<DbMatch> {
    const { tournamentId, matchId: id } = params;

    await this.assertMatchBelongsToTournament({ matchId: id, tournamentId });

    const [deleted] = await this.drizzle
      .delete(matches)
      .where(eq(matches.id, id))
      .returning();

    if (!deleted) {
      throw new MatchException(
        `Match not found`,
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }

    return deleted;
  }

  async getById(params: { id: MatchId }): Promise<DbMatch> {
    const { id } = params;

    const match = await this.drizzle.query.matches.findFirst({
      where: eq(matches.id, id),
    });

    if (!match) {
      throw new MatchException(
        `Match not found`,
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }

    return match;
  }

  async existsById(params: { id: MatchId }): Promise<boolean> {
    const { id } = params;

    const match = await this.drizzle.query.matches.findFirst({
      where: eq(matches.id, id),
    });

    return !!match;
  }

  async getByAuthor(
    params: { creatorId: UserId } & PaginationParams,
  ): Promise<DbMatch[]> {
    const { creatorId, limit, offset } = params;

    const found = await this.drizzle.query.matches.findMany({
      where: eq(matches.creatorId, creatorId),
      limit,
      offset,
    });

    return found;
  }

  async getParticipant(params: {
    matchId: MatchId;
    userId: UserId;
  }): Promise<DbMatchParticipant> {
    const { matchId, userId } = params;

    const participant = await this.drizzle.query.matchParticipants.findFirst({
      where: and(
        eq(matchParticipants.matchId, matchId),
        eq(matchParticipants.userId, userId),
      ),
    });

    if (!participant) {
      throw new MatchException(
        `Participant not found`,
        MatchExceptionCode.PARTICIPANT_NOT_FOUND,
      );
    }

    return participant;
  }

  async getParticipants(
    params: {
      matchId: MatchId;
    } & PaginationParams,
  ): Promise<DbUser[]> {
    const { matchId, limit, offset } = params;

    const found = await this.drizzle
      .select({
        user: users,
      })
      .from(matchParticipants)
      .innerJoin(users, eq(users.id, matchParticipants.userId))
      .where(eq(matchParticipants.matchId, matchId))
      .limit(limit)
      .offset(offset);

    return found.map(({ user }) => user);
  }

  async register(params: {
    matchId: MatchId;
    userId: UserId;
  }): Promise<DbMatchParticipant> {
    const { matchId, userId } = params;

    await this.assertIsNotParticipating({ matchId, userId });

    const [created] = await this.drizzle
      .insert(matchParticipants)
      .values({ userId, matchId })
      .returning();

    return created;
  }

  async unregister(params: {
    matchId: MatchId;
    userId: UserId;
  }): Promise<DbMatchParticipant> {
    const { matchId, userId } = params;

    await this.assertIsParticipating({ matchId, userId });

    const [deleted] = await this.drizzle
      .delete(matchParticipants)
      .where(
        and(
          eq(matchParticipants.matchId, matchId),
          eq(matchParticipants.userId, userId),
        ),
      )
      .returning();

    return deleted;
  }

  private async assertIsParticipating(params: {
    matchId: MatchId;
    userId: UserId;
  }) {
    const { matchId, userId } = params;

    const participant = await this.drizzle.query.matchParticipants.findFirst({
      where: and(
        eq(matchParticipants.matchId, matchId),
        eq(matchParticipants.userId, userId),
      ),
    });

    if (!participant) {
      throw new MatchException(
        `User is not participating in the match`,
        MatchExceptionCode.ALREADY_PARTICIPATING,
      );
    }
  }

  private async assertIsNotParticipating(params: {
    matchId: MatchId;
    userId: UserId;
  }) {
    const { matchId, userId } = params;

    const participant = await this.drizzle.query.matchParticipants.findFirst({
      where: and(
        eq(matchParticipants.matchId, matchId),
        eq(matchParticipants.userId, userId),
      ),
    });

    if (participant) {
      throw new MatchException(
        `User is already participating in the match`,
        MatchExceptionCode.ALREADY_PARTICIPATING,
      );
    }
  }

  private async assertStageBelongsToTournament(params: {
    stageId: StageId;
    tournamentId: TournamentId;
  }): Promise<void> {
    const { stageId, tournamentId } = params;

    const stage = await this.drizzle.query.stages.findFirst({
      where: and(eq(stages.id, stageId), eq(stages.tournamentId, tournamentId)),
    });

    if (!stage) {
      throw new MatchException(
        `Stage not found`,
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }
  }

  private hasManualScore(data: ScheduleMatchUpsertInput): boolean {
    return (
      data.redScore !== null ||
      data.blueScore !== null ||
      data.players.some((player) => player.score !== null)
    );
  }

  private async assertMatchCompetitors(
    tournamentId: TournamentId,
    data: ScheduleMatchUpsertInput,
  ): Promise<void> {
    const tournament = await this.drizzle.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    const hasTeams = data.redTeamId !== null;
    if (tournament?.isTeam !== hasTeams) {
      throw new MatchException(
        tournament?.isTeam
          ? 'Team matches require two teams'
          : 'Solo matches cannot have teams',
        MatchExceptionCode.MATCH_ACCESS_DENIED,
      );
    }
    if (!hasTeams) {
      const playerIds = [...new Set(data.players.map(({ userId }) => userId))];
      if (playerIds.length === 0) return;

      const registered = await this.drizzle
        .select({ userId: soloParticipants.userId })
        .from(soloParticipants)
        .where(
          and(
            eq(soloParticipants.tournamentId, tournamentId),
            inArray(soloParticipants.userId, playerIds),
          ),
        );

      if (registered.length !== playerIds.length) {
        throw new MatchException(
          'Players must participate in the tournament',
          MatchExceptionCode.MATCH_ACCESS_DENIED,
        );
      }

      return;
    }
    if (!data.redTeamId || !data.blueTeamId) {
      throw new MatchException(
        'Team matches require two teams',
        MatchExceptionCode.MATCH_ACCESS_DENIED,
      );
    }

    const found = await this.drizzle
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(
          eq(teams.tournamentId, tournamentId),
          inArray(teams.id, [data.redTeamId, data.blueTeamId]),
        ),
      );
    if (found.length !== 2) {
      throw new MatchException(
        'Teams must belong to the tournament',
        MatchExceptionCode.MATCH_ACCESS_DENIED,
      );
    }
  }

  private async assertMatchBelongsToTournament(params: {
    matchId: MatchId;
    tournamentId: TournamentId;
  }): Promise<void> {
    const { matchId, tournamentId } = params;

    const [found] = await this.drizzle
      .select({ id: matches.id })
      .from(matches)
      .innerJoin(stages, eq(stages.id, matches.stageId))
      .where(
        and(eq(matches.id, matchId), eq(stages.tournamentId, tournamentId)),
      )
      .limit(1);

    if (!found) {
      throw new MatchException(
        `Match not found`,
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }
  }

  private async replaceParticipants(
    tx: Pick<Schema, 'delete' | 'insert'>,
    matchIdValue: MatchId,
    players: ScheduleMatchUpsertInput['players'],
  ): Promise<void> {
    await tx
      .delete(matchParticipants)
      .where(eq(matchParticipants.matchId, matchIdValue));

    if (players.length === 0) return;

    const winnerIds = this.resolveWinnerIds(players);

    await tx.insert(matchParticipants).values(
      players.map((player) => ({
        matchId: matchIdValue,
        userId: player.userId,
        score: player.score,
        isWinner: winnerIds ? winnerIds.has(player.userId) : null,
      })),
    );
  }

  private async replaceStaff(
    tx: Pick<Schema, 'delete' | 'insert'>,
    matchIdValue: MatchId,
    staff: ScheduleMatchUpsertInput['staff'],
  ): Promise<void> {
    await tx.delete(matchStaff).where(eq(matchStaff.matchId, matchIdValue));

    if (staff.length === 0) return;

    await tx.insert(matchStaff).values(
      staff.map((staffMember) => ({
        matchId: matchIdValue,
        userId: staffMember.userId,
        role: staffMember.role,
      })),
    );
  }

  private resolveWinnerIds(
    players: ScheduleMatchUpsertInput['players'],
  ): Set<string> | null {
    if (players.length < 2 || players.some((player) => player.score === null)) {
      return null;
    }

    const maxScore = Math.max(...players.map((player) => player.score ?? 0));
    const winners = players.filter((player) => player.score === maxScore);

    if (winners.length !== 1) return null;

    return new Set(winners.map((winner) => winner.userId));
  }

  public async getMatchWithParticipants(
    params: {
      matchId: MatchId;
    } & PaginationParams,
  ): Promise<{ match: DbMatch; participants: DbUser[] }> {
    const { matchId, limit, offset } = params;

    const match = await this.drizzle.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!match) {
      throw new MatchException(
        `Match not found`,
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }

    const participants = await this.getParticipants({ matchId, limit, offset });

    return { match, participants };
  }
}
