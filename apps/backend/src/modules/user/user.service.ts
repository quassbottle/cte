import { Inject, Injectable } from '@nestjs/common';
import { eq, ilike, or } from 'drizzle-orm';
import {
  UserException,
  UserExceptionCode,
} from 'lib/domain/user/user.exception';
import { userId, UserId } from 'lib/domain/user/user.id';
import { DbUser, Schema, users } from 'lib/infrastructure/db';

@Injectable()
export class UserService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async getByOsuId(params: { osuId: number }): Promise<DbUser> {
    const { osuId } = params;

    const candidate = await this.drizzle.query.users.findFirst({
      where: eq(users.osuId, osuId),
    });

    if (!candidate) {
      throw new UserException(
        `User not found`,
        UserExceptionCode.USER_NOT_FOUND,
      );
    }

    return candidate;
  }

  public async getById(params: { id: UserId }): Promise<DbUser> {
    const { id } = params;

    const candidate = await this.drizzle.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!candidate) {
      throw new UserException(
        `User not found`,
        UserExceptionCode.USER_NOT_FOUND,
      );
    }

    return candidate;
  }

  public async getByLookup(params: { query: string }): Promise<DbUser> {
    const query = params.query.trim();
    if (!query) {
      throw new UserException(
        `User not found`,
        UserExceptionCode.USER_NOT_FOUND,
      );
    }

    const parsedOsuId = Number(query);
    const hasOsuId = Number.isInteger(parsedOsuId);
    const candidate = await this.drizzle.query.users.findFirst({
      where: hasOsuId
        ? or(
            eq(users.id, query as UserId),
            eq(users.osuId, parsedOsuId),
            ilike(users.osuUsername, query),
          )
        : or(eq(users.id, query as UserId), ilike(users.osuUsername, query)),
    });

    if (!candidate) {
      throw new UserException(
        `User not found`,
        UserExceptionCode.USER_NOT_FOUND,
      );
    }

    return candidate;
  }

  public async existsById(params: { id: UserId }): Promise<boolean> {
    const { id } = params;

    const candidate = await this.drizzle.query.users.findFirst({
      where: eq(users.id, id),
    });

    return !!candidate;
  }

  public async existsByOsuId(params: { osuId: number }): Promise<boolean> {
    const { osuId } = params;

    const candidate = await this.drizzle.query.users.findFirst({
      where: eq(users.osuId, osuId),
    });

    return !!candidate;
  }

  public async create(params: {
    osuId: number;
    osuUsername: string;
  }): Promise<DbUser> {
    const id = userId();

    const [created] = await this.drizzle
      .insert(users)
      .values({ id, ...params })
      .returning();

    return created;
  }
}
