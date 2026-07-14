import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { EnvService } from 'lib/common/env/env.service';
import type { MatchId } from 'lib/domain/match/match.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  matchOsuSync,
  matchParticipants,
  qualificationAttempts,
  Schema,
  stages,
  users,
} from 'lib/infrastructure/db';
import { parseOsuMatchId } from './mp-url';
import {
  MatchSyncInput,
  MatchSyncPoints,
  QualificationAttemptInput,
  QualificationMatchSyncInput,
  SoloMatchSyncInput,
  SyncLease,
  TeamMatchSyncInput,
} from './types';

type ApplySuccessParams = {
  lease: SyncLease;
  closedAt: Date | null;
  background: boolean;
} & (
  | {
      input: QualificationMatchSyncInput;
      attempts: QualificationAttemptInput[];
    }
  | {
      input: SoloMatchSyncInput | TeamMatchSyncInput;
      points: MatchSyncPoints;
    }
);

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
      const now = new Date();
      const rows = await tx
        .select({
          matchId: matchOsuSync.matchId,
          osuMatchId: matchOsuSync.osuMatchId,
          status: matchOsuSync.status,
        })
        .from(matchOsuSync)
        .where(
          and(
            eq(matchOsuSync.status, 'active'),
            lte(matchOsuSync.nextSyncAt, now),
            or(
              isNull(matchOsuSync.leaseUntil),
              lte(matchOsuSync.leaseUntil, now),
            ),
          ),
        )
        .orderBy(asc(matchOsuSync.nextSyncAt))
        .limit(limit)
        .for('update', { skipLocked: true });

      return Promise.all(
        rows.map(async (row) => {
          const leaseToken = randomUUID();
          await tx
            .update(matchOsuSync)
            .set({
              leaseToken,
              leaseUntil: new Date(
                now.valueOf() + this.env.get('OSU_MATCH_SYNC_LEASE_MS'),
              ),
            })
            .where(eq(matchOsuSync.matchId, row.matchId));
          return {
            matchId: row.matchId,
            osuMatchId: row.osuMatchId,
            leaseToken,
            status: row.status,
          };
        }),
      );
    });
  }

  public async activate(
    matchId: MatchId,
    mpUrl: string,
    db: Pick<Schema, 'insert'> = this.drizzle,
  ): Promise<void> {
    const osuMatchId = parseOsuMatchId(mpUrl);
    if (!osuMatchId) throw new Error('Invalid osu multiplayer URL');
    await db
      .insert(matchOsuSync)
      .values({
        matchId,
        osuMatchId,
        status: 'active',
        nextSyncAt: new Date(),
      })
      .onConflictDoUpdate({
        target: matchOsuSync.matchId,
        set: {
          osuMatchId,
          status: 'active',
          nextSyncAt: new Date(),
          leaseUntil: null,
          leaseToken: null,
          lastError: null,
          attempts: 0,
        },
      });
  }

  public async ensureSync(matchId: MatchId): Promise<void> {
    const sync = await this.getState(matchId);
    if (sync) return;

    const match = await this.drizzle.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });
    if (!match?.mpUrl) {
      throw new Error('Match has no osu multiplayer URL');
    }
    await this.activate(matchId, match.mpUrl);
  }

  public async stop(
    matchId: MatchId,
    db: Pick<Schema, 'update'> = this.drizzle,
  ): Promise<void> {
    await db
      .update(matchOsuSync)
      .set({ status: 'stopped', leaseUntil: null, leaseToken: null })
      .where(eq(matchOsuSync.matchId, matchId));
  }

  public async invalidateLease(
    matchId: MatchId,
    db: Pick<Schema, 'update'> = this.drizzle,
  ): Promise<void> {
    await db
      .update(matchOsuSync)
      .set({ leaseUntil: null, leaseToken: null })
      .where(eq(matchOsuSync.matchId, matchId));
  }

  public async getState(matchId: MatchId) {
    return this.drizzle.query.matchOsuSync.findFirst({
      where: eq(matchOsuSync.matchId, matchId),
    });
  }

  public async claimOne(matchId: MatchId): Promise<SyncLease | null> {
    return this.drizzle.transaction(async (tx) => {
      const now = new Date();
      const row = await tx
        .select({
          matchId: matchOsuSync.matchId,
          osuMatchId: matchOsuSync.osuMatchId,
          status: matchOsuSync.status,
        })
        .from(matchOsuSync)
        .where(
          and(
            eq(matchOsuSync.matchId, matchId),
            or(
              isNull(matchOsuSync.leaseUntil),
              lte(matchOsuSync.leaseUntil, now),
            ),
          ),
        )
        .for('update')
        .limit(1)
        .then((rows) => rows[0]);
      if (!row) return null;

      const leaseToken = randomUUID();
      await tx
        .update(matchOsuSync)
        .set({
          leaseToken,
          leaseUntil: new Date(
            now.valueOf() + this.env.get('OSU_MATCH_SYNC_LEASE_MS'),
          ),
        })
        .where(eq(matchOsuSync.matchId, row.matchId));
      return {
        matchId: row.matchId,
        osuMatchId: row.osuMatchId,
        leaseToken,
        status: row.status,
      };
    });
  }

  public async loadInput(matchId: MatchId): Promise<MatchSyncInput> {
    const [matchRows, players, mappoolBeatmaps] = await Promise.all([
      this.drizzle
        .select({
          redTeamId: matches.redTeamId,
          blueTeamId: matches.blueTeamId,
          type: stages.type,
        })
        .from(matches)
        .innerJoin(stages, eq(stages.id, matches.stageId))
        .where(eq(matches.id, matchId))
        .limit(1),
      this.drizzle
        .select({ userId: users.id, osuId: users.osuId })
        .from(matchParticipants)
        .innerJoin(users, eq(users.id, matchParticipants.userId))
        .where(eq(matchParticipants.matchId, matchId))
        .orderBy(asc(users.id)),
      this.drizzle
        .select({ osuBeatmapId: beatmaps.osuBeatmapId })
        .from(matches)
        .innerJoin(mappools, eq(mappools.stageId, matches.stageId))
        .innerJoin(
          mappoolsBeatmaps,
          eq(mappoolsBeatmaps.mappoolId, mappools.id),
        )
        .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
        .where(eq(matches.id, matchId)),
    ]);
    const match = matchRows[0];
    if (!match || mappoolBeatmaps.length === 0) {
      throw new Error('Match sync requires a stage mappool');
    }
    const allowedBeatmapIds = new Set(
      mappoolBeatmaps.map((row) => row.osuBeatmapId),
    );
    if (match.type === 'qualification') {
      return { kind: 'qualification', allowedBeatmapIds };
    }
    if (match.redTeamId || match.blueTeamId) {
      if (!match.redTeamId || !match.blueTeamId) {
        throw new Error('Team match sync requires two teams');
      }
      return {
        kind: 'team',
        allowedBeatmapIds,
      };
    }
    const [firstPlayer, secondPlayer] = players;
    if (!firstPlayer || !secondPlayer || players.length !== 2) {
      throw new Error('Solo match sync requires two participants');
    }
    return {
      kind: 'solo',
      players: [firstPlayer, secondPlayer],
      allowedBeatmapIds,
    };
  }

  public async applySuccess(params: ApplySuccessParams): Promise<boolean> {
    return this.drizzle.transaction(async (tx) => {
      const locked = await tx
        .select({ matchId: matchOsuSync.matchId })
        .from(matchOsuSync)
        .where(
          and(
            eq(matchOsuSync.matchId, params.lease.matchId),
            eq(matchOsuSync.leaseToken, params.lease.leaseToken),
            gte(matchOsuSync.leaseUntil, new Date()),
          ),
        )
        .for('update')
        .limit(1);
      if (!locked[0]) return false;

      if ('attempts' in params) {
        if (params.attempts.length) {
          const osuBeatmapIds = [
            ...new Set(params.attempts.map((attempt) => attempt.osuBeatmapId)),
          ];
          const osuUserIds = [
            ...new Set(params.attempts.map((attempt) => attempt.osuUserId)),
          ];
          const beatmapRows = await tx
            .select({ id: beatmaps.id, osuBeatmapId: beatmaps.osuBeatmapId })
            .from(beatmaps)
            .where(inArray(beatmaps.osuBeatmapId, osuBeatmapIds));
          const userRows = await tx
            .select({ id: users.id, osuId: users.osuId })
            .from(users)
            .where(inArray(users.osuId, osuUserIds));
          const beatmapIdsByOsuId = new Map(
            beatmapRows.map((row) => [row.osuBeatmapId, row.id]),
          );
          const userIdsByOsuId = new Map(
            userRows.map((row) => [row.osuId, row.id]),
          );
          const values = params.attempts.flatMap((attempt) => {
            const beatmapId = beatmapIdsByOsuId.get(attempt.osuBeatmapId);
            const userId = userIdsByOsuId.get(attempt.osuUserId);
            return beatmapId && userId
              ? [
                  {
                    matchId: params.lease.matchId,
                    osuGameId: attempt.osuGameId,
                    beatmapId,
                    userId,
                    score: attempt.score,
                  },
                ]
              : [];
          });
          if (values.length) {
            await tx
              .insert(qualificationAttempts)
              .values(values)
              .onConflictDoUpdate({
                target: [
                  qualificationAttempts.matchId,
                  qualificationAttempts.osuGameId,
                  qualificationAttempts.userId,
                ],
                set: {
                  beatmapId: sql`excluded.beatmap_id`,
                  score: sql`excluded.score`,
                  updatedAt: new Date(),
                },
              });
          }
        }
      } else if (params.input.kind === 'team') {
        await tx
          .update(matches)
          .set({
            redScore: params.points.redScore,
            blueScore: params.points.blueScore,
          })
          .where(eq(matches.id, params.lease.matchId));
      } else {
        const [first, second] = params.input.players;
        const firstWins =
          params.points.redScore === params.points.blueScore
            ? null
            : params.points.redScore > params.points.blueScore;
        const secondWins =
          params.points.redScore === params.points.blueScore
            ? null
            : params.points.blueScore > params.points.redScore;
        await tx
          .update(matchParticipants)
          .set({ score: params.points.redScore, isWinner: firstWins })
          .where(
            and(
              eq(matchParticipants.matchId, params.lease.matchId),
              eq(matchParticipants.userId, first.userId),
            ),
          );
        await tx
          .update(matchParticipants)
          .set({ score: params.points.blueScore, isWinner: secondWins })
          .where(
            and(
              eq(matchParticipants.matchId, params.lease.matchId),
              eq(matchParticipants.userId, second.userId),
            ),
          );
      }
      const now = new Date();
      await tx
        .update(matchOsuSync)
        .set({
          status:
            params.background && params.closedAt
              ? 'completed'
              : params.lease.status,
          nextSyncAt:
            params.background && !params.closedAt
              ? new Date(
                  now.valueOf() +
                    this.env.get('OSU_MATCH_SYNC_POLL_INTERVAL_MS'),
                )
              : now,
          leaseToken: null,
          leaseUntil: null,
          lastSyncedAt: now,
          lastError: null,
          attempts: 0,
        })
        .where(
          and(
            eq(matchOsuSync.matchId, params.lease.matchId),
            eq(matchOsuSync.leaseToken, params.lease.leaseToken),
          ),
        );
      return true;
    });
  }

  public async applyFailure(lease: SyncLease, error: unknown): Promise<void> {
    const current = await this.drizzle.query.matchOsuSync.findFirst({
      where: and(
        eq(matchOsuSync.matchId, lease.matchId),
        eq(matchOsuSync.leaseToken, lease.leaseToken),
      ),
    });
    if (!current) return;

    const attempts = current.attempts + 1;
    const delay = Math.min(
      this.env.get('OSU_MATCH_SYNC_MAX_BACKOFF_MS'),
      this.env.get('OSU_MATCH_SYNC_POLL_INTERVAL_MS') *
        2 ** Math.min(attempts, 8),
    );
    await this.drizzle
      .update(matchOsuSync)
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
          eq(matchOsuSync.matchId, lease.matchId),
          eq(matchOsuSync.leaseToken, lease.leaseToken),
          gte(matchOsuSync.leaseUntil, new Date()),
        ),
      );
  }
}
