import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { EnvService } from 'lib/common/env/env.service';
import { Schema } from 'lib/infrastructure/db';
import { SyncLease } from './types';

@Injectable()
export class MatchSyncRepository {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly env: EnvService,
  ) {}

  public async claimDue(
    limit = this.env.get('OSU_MATCH_SYNC_BATCH_SIZE'),
  ): Promise<SyncLease[]> {
    return this.drizzle.transaction(async (tx) => {
      const claimed = await tx.execute(sql<{
        match_id: string;
        osu_match_id: number;
        status: SyncLease['status'];
      }>`
      select match_id, osu_match_id, status
      from match_osu_sync
      where status = 'active'
        and next_sync_at <= now()
        and (lease_until is null or lease_until <= now())
      order by next_sync_at
      for update skip locked
      limit ${limit}
      `);

      const rows = claimed.rows as {
        match_id: string;
        osu_match_id: number;
        status: SyncLease['status'];
      }[];

      return Promise.all(
        rows.map(async (row) => {
          const leaseToken = randomUUID();
          await tx.execute(sql`
          update match_osu_sync
          set lease_token = ${leaseToken},
              lease_until = now() + (${this.env.get('OSU_MATCH_SYNC_LEASE_MS')} * interval '1 millisecond'),
              updated_at = now()
          where match_id = ${row.match_id}
          `);
          return {
            matchId: row.match_id,
            osuMatchId: row.osu_match_id,
            leaseToken,
            status: row.status,
          };
        }),
      );
    });
  }
}
