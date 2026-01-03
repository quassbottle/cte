import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import {
  MatchException,
  MatchExceptionCode,
} from 'lib/domain/match/match.exception';
import { MatchId, matchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  DbMatch,
  DbParticipant,
  DbUser,
  matches,
  participants,
  Schema,
  users,
} from 'lib/infrastructure/db';
import { MatchCreateParams } from './types';

@Injectable()
export class MatchService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  async create(data: MatchCreateParams): Promise<DbMatch> {
    const id = matchId();

    const [match] = await this.drizzle
      .insert(matches)
      .values({ id, ...data })
      .returning();

    return match;
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
  }): Promise<DbParticipant> {
    const { matchId, userId } = params;

    const participant = await this.drizzle.query.participants.findFirst({
      where: and(
        eq(participants.matchId, matchId),
        eq(participants.userId, userId),
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
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(eq(participants.matchId, matchId))
      .limit(limit)
      .offset(offset);

    return found.map(({ user }) => user);
  }

  async register(params: {
    matchId: MatchId;
    userId: UserId;
  }): Promise<DbParticipant> {
    const { matchId, userId } = params;

    await this.assertIsNotParticipating({ matchId, userId });

    const [created] = await this.drizzle
      .insert(participants)
      .values({ userId, matchId })
      .returning();

    return created;
  }

  async unregister(params: {
    matchId: MatchId;
    userId: UserId;
  }): Promise<DbParticipant> {
    const { matchId, userId } = params;

    await this.assertIsParticipating({ matchId, userId });

    const [deleted] = await this.drizzle
      .delete(participants)
      .where(
        and(eq(participants.matchId, matchId), eq(participants.userId, userId)),
      )
      .returning();

    return deleted;
  }

  private async assertIsParticipating(params: {
    matchId: MatchId;
    userId: UserId;
  }) {
    const { matchId, userId } = params;

    const participant = await this.getParticipant({ matchId, userId });

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

    const participant = await this.getParticipant({ matchId, userId });

    if (participant) {
      throw new MatchException(
        `User is already participating in the match`,
        MatchExceptionCode.ALREADY_PARTICIPATING,
      );
    }
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
