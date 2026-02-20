import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import {
  TournamentId,
  tournamentId,
} from 'lib/domain/tournament/tournament.id';
import { DbTournament, Schema, tournaments } from 'lib/infrastructure/db';
import { TournamentCreateParams, TournamentUpdateParams } from './types';

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
}
