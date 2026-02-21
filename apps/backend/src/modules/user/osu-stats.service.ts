import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { UserId } from 'lib/domain/user/user.id';
import { OsuStatsMode, Schema, osuStats } from 'lib/infrastructure/db';

export type UpsertOsuStatsParams = {
  userId: UserId;
  osuId: number;
  mode: OsuStatsMode;
  performancePoints: number | null;
  rank: number | null;
};

@Injectable()
export class OsuStatsService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async upsertMany(params: UpsertOsuStatsParams[]): Promise<void> {
    if (params.length === 0) {
      return;
    }

    for (const row of params) {
      await this.drizzle
        .insert(osuStats)
        .values(row)
        .onConflictDoUpdate({
          target: [osuStats.userId, osuStats.mode],
          set: {
            osuId: row.osuId,
            performancePoints: row.performancePoints,
            rank: row.rank,
            updatedAt: new Date(),
          },
          setWhere: and(
            eq(osuStats.userId, row.userId),
            eq(osuStats.mode, row.mode),
          ),
        });
    }
  }
}
