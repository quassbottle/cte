import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { EnvService } from 'lib/common/env/env.service';
import { Schema } from 'lib/infrastructure/db';
import { MatchSyncInput, SyncLease } from './types';

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

  public async claimOne(matchId: string): Promise<SyncLease | null> {
    return this.drizzle.transaction(async (tx) => {
      const result = await tx.execute(sql<{
        match_id: string;
        osu_match_id: number;
        status: SyncLease['status'];
      }>`
        select match_id, osu_match_id, status
        from match_osu_sync
        where match_id = ${matchId}
          and (lease_until is null or lease_until <= now())
        for update
      `);
      const row = result.rows[0] as
        | {
            match_id: string;
            osu_match_id: number;
            status: SyncLease['status'];
          }
        | undefined;
      if (!row) return null;

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
    });
  }

  public async loadInput(matchId: string): Promise<MatchSyncInput> {
    const [playersResult, beatmapsResult] = await Promise.all([
      this.drizzle.execute(sql<{ user_id: string; osu_id: number }>`
        select u.id as user_id, u.osu_id
        from match_participants mp
        inner join users u on u.id = mp.user_id
        where mp.match_id = ${matchId}
        order by u.id
      `),
      this.drizzle.execute(sql<{ osu_beatmap_id: number }>`
        select b.osu_beatmap_id
        from matches m
        inner join mappools p on p.stage_id = m.stage_id
        inner join mappools_beatmaps pb on pb.mappool_id = p.id
        inner join beatmaps b on b.id = pb.beatmap_id
        where m.id = ${matchId}
      `),
    ]);
    const players = playersResult.rows as { user_id: string; osu_id: number }[];
    if (players.length !== 2 || beatmapsResult.rows.length === 0) {
      throw new Error(
        'Match sync requires two participants and a stage mappool',
      );
    }
    return {
      players: players.map((player) => ({
        userId: player.user_id,
        osuId: player.osu_id,
      })) as MatchSyncInput['players'],
      allowedBeatmapIds: new Set(
        (beatmapsResult.rows as { osu_beatmap_id: number }[]).map(
          (row) => row.osu_beatmap_id,
        ),
      ),
    };
  }

  public async applySuccess(params: {
    lease: SyncLease;
    input: MatchSyncInput;
    points: ReadonlyMap<number, number>;
    closedAt: Date | null;
    background: boolean;
  }): Promise<boolean> {
    return this.drizzle.transaction(async (tx) => {
      const locked = await tx.execute(sql<{ status: SyncLease['status'] }>`
        select status from match_osu_sync
        where match_id = ${params.lease.matchId} and lease_token = ${params.lease.leaseToken}
        for update
      `);
      if (!locked.rows[0]) return false;

      const [first, second] = params.input.players;
      const firstPoints = params.points.get(first.osuId) ?? 0;
      const secondPoints = params.points.get(second.osuId) ?? 0;
      await tx.execute(sql`
        update match_participants set score = case user_id
          when ${first.userId} then ${firstPoints}
          when ${second.userId} then ${secondPoints}
        end,
        is_winner = case
          when ${firstPoints} = ${secondPoints} then null
          when user_id = ${first.userId} then ${firstPoints > secondPoints}
          else ${secondPoints > firstPoints}
        end,
        updated_at = now()
        where match_id = ${params.lease.matchId} and user_id in (${first.userId}, ${second.userId})
      `);
      await tx.execute(sql`
        update match_osu_sync
        set status = case when ${params.background} and ${params.closedAt !== null} then 'completed' else status end,
            next_sync_at = case when ${params.background} and ${params.closedAt === null}
              then now() + (${this.env.get('OSU_MATCH_SYNC_POLL_INTERVAL_MS')} * interval '1 millisecond')
              else next_sync_at end,
            lease_token = null, lease_until = null, last_synced_at = now(), last_error = null, attempts = 0, updated_at = now()
        where match_id = ${params.lease.matchId} and lease_token = ${params.lease.leaseToken}
      `);
      return true;
    });
  }
}
