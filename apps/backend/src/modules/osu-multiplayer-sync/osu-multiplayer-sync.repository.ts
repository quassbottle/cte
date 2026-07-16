import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { and, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { EnvService } from 'lib/common/env/env.service';
import { OsuRoomId, osuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import {
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
  Schema,
} from 'lib/infrastructure/db';
import {
  OsuMatchSnapshot,
  OsuRoomLease,
  RoomSyncStatus,
} from './osu-multiplayer-sync.types';

@Injectable()
export class OsuMultiplayerSyncRepository {
  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly env: EnvService,
  ) {}

  public async ensureRoom(osuMatchId: number): Promise<OsuRoomId> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.osuMultiplayerRooms.findFirst({
        where: eq(osuMultiplayerRooms.osuMatchId, osuMatchId),
      });
      if (existing) return existing.id;
      const [room] = await tx
        .insert(osuMultiplayerRooms)
        .values({ id: osuRoomId(), osuMatchId })
        .onConflictDoNothing()
        .returning({ id: osuMultiplayerRooms.id });
      if (room) return room.id;
      return (await tx.query.osuMultiplayerRooms.findFirst({
        where: eq(osuMultiplayerRooms.osuMatchId, osuMatchId),
      }))!.id;
    });
  }

  public async claim(
    roomId: OsuRoomId,
    force = false,
  ): Promise<OsuRoomLease | null> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const row = await tx
        .select({
          roomId: osuMultiplayerRooms.id,
          osuMatchId: osuMultiplayerRooms.osuMatchId,
          status: osuMultiplayerRooms.status,
        })
        .from(osuMultiplayerRooms)
        .where(
          and(
            eq(osuMultiplayerRooms.id, roomId),
            or(
              isNull(osuMultiplayerRooms.leaseUntil),
              lte(osuMultiplayerRooms.leaseUntil, now),
            ),
            force ? undefined : eq(osuMultiplayerRooms.status, 'active'),
          ),
        )
        .for('update')
        .limit(1)
        .then((rows) => rows[0]);
      if (!row) return null;
      const leaseToken = randomUUID();
      await tx
        .update(osuMultiplayerRooms)
        .set({
          leaseToken,
          leaseUntil: new Date(
            now.valueOf() + this.env.get('OSU_MATCH_SYNC_LEASE_MS'),
          ),
        })
        .where(eq(osuMultiplayerRooms.id, roomId));
      return {
        ...row,
        status: force ? ('active' as const) : row.status,
        leaseToken,
      };
    });
  }

  public async applySnapshot(
    lease: OsuRoomLease,
    snapshot: OsuMatchSnapshot,
  ): Promise<{ changed: boolean; status: RoomSyncStatus }> {
    return this.db.transaction(async (tx) => {
      const [room] = await tx
        .select({
          roomId: osuMultiplayerRooms.id,
          snapshotHash: osuMultiplayerRooms.snapshotHash,
        })
        .from(osuMultiplayerRooms)
        .where(
          and(
            eq(osuMultiplayerRooms.id, lease.roomId),
            eq(osuMultiplayerRooms.leaseToken, lease.leaseToken),
            gte(osuMultiplayerRooms.leaseUntil, new Date()),
          ),
        )
        .for('update')
        .limit(1);
      if (!room) throw new Error('Osu room sync lease expired');

      const games = [...snapshot.games]
        .sort((a, b) => a.id - b.id)
        .map((game) => ({
          ...game,
          endedAt: game.endedAt?.toISOString() ?? null,
          scores: [...game.scores].sort((a, b) => a.userId - b.userId),
        }));
      const snapshotHash = createHash('sha256')
        .update(
          JSON.stringify({
            closedAt: snapshot.closedAt?.toISOString() ?? null,
            games,
          }),
        )
        .digest('hex');
      const changed = room.snapshotHash !== snapshotHash;
      const now = new Date();
      const status: RoomSyncStatus = snapshot.closedAt
        ? 'completed'
        : lease.status;

      if (changed) {
        const gameValues = games.map((game) => ({
          roomId: lease.roomId,
          osuGameId: game.id,
          osuBeatmapId: game.beatmapId,
          endedAt: game.endedAt ? new Date(game.endedAt) : null,
        }));
        const scoreValues = games.flatMap((game) =>
          game.scores.map((score) => ({
            roomId: lease.roomId,
            osuGameId: game.id,
            osuUserId: score.userId,
            osuBeatmapId: game.beatmapId,
            score: score.score,
            team: score.team,
          })),
        );
        await tx
          .delete(osuMultiplayerScores)
          .where(eq(osuMultiplayerScores.roomId, lease.roomId));
        await tx
          .delete(osuMultiplayerGames)
          .where(eq(osuMultiplayerGames.roomId, lease.roomId));
        if (gameValues.length) {
          await tx
            .insert(osuMultiplayerGames)
            .values(gameValues)
            .onConflictDoUpdate({
              target: [
                osuMultiplayerGames.roomId,
                osuMultiplayerGames.osuGameId,
              ],
              set: {
                osuBeatmapId: sql`excluded.osu_beatmap_id`,
                endedAt: sql`excluded.ended_at`,
                updatedAt: now,
              },
            });
        }
        if (scoreValues.length) {
          await tx
            .insert(osuMultiplayerScores)
            .values(scoreValues)
            .onConflictDoUpdate({
              target: [
                osuMultiplayerScores.roomId,
                osuMultiplayerScores.osuGameId,
                osuMultiplayerScores.osuUserId,
              ],
              set: {
                osuBeatmapId: sql`excluded.osu_beatmap_id`,
                score: sql`excluded.score`,
                team: sql`excluded.team`,
                updatedAt: now,
              },
            });
        }
      }
      await tx
        .update(osuMultiplayerRooms)
        .set({
          status,
          snapshotHash,
          lastSyncedAt: now,
          lastDataChangedAt: changed ? now : undefined,
          nextSyncAt:
            status === 'active'
              ? new Date(
                  now.valueOf() +
                    this.env.get('OSU_MATCH_SYNC_POLL_INTERVAL_MS'),
                )
              : now,
          leaseToken: null,
          leaseUntil: null,
          lastError: null,
          attempts: 0,
        })
        .where(
          and(
            eq(osuMultiplayerRooms.id, lease.roomId),
            eq(osuMultiplayerRooms.leaseToken, lease.leaseToken),
          ),
        );
      return { changed, status };
    });
  }

  public async applyFailure(
    lease: OsuRoomLease,
    error: unknown,
  ): Promise<void> {
    const current = await this.db.query.osuMultiplayerRooms.findFirst({
      where: and(
        eq(osuMultiplayerRooms.id, lease.roomId),
        eq(osuMultiplayerRooms.leaseToken, lease.leaseToken),
      ),
    });
    if (!current) return;
    const attempts = current.attempts + 1;
    const delay = Math.min(
      this.env.get('OSU_MATCH_SYNC_MAX_BACKOFF_MS'),
      this.env.get('OSU_MATCH_SYNC_POLL_INTERVAL_MS') *
        2 ** Math.min(attempts, 8),
    );
    await this.db
      .update(osuMultiplayerRooms)
      .set({
        attempts,
        lastError:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : 'Unknown osu sync error',
        leaseToken: null,
        leaseUntil: null,
        nextSyncAt: new Date(Date.now() + delay),
      })
      .where(
        and(
          eq(osuMultiplayerRooms.id, lease.roomId),
          eq(osuMultiplayerRooms.leaseToken, lease.leaseToken),
          gte(osuMultiplayerRooms.leaseUntil, new Date()),
        ),
      );
  }

  public async stop(roomId: OsuRoomId): Promise<void> {
    await this.db
      .update(osuMultiplayerRooms)
      .set({ status: 'stopped', leaseToken: null, leaseUntil: null })
      .where(eq(osuMultiplayerRooms.id, roomId));
  }
}
