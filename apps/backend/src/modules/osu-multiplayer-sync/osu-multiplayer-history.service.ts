import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import {
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
  Schema,
  users,
} from 'lib/infrastructure/db';

export type OsuMultiplayerHistory = {
  osuMatchId: number;
  status: 'active' | 'stopped' | 'completed';
  lastSyncedAt: Date | null;
  games: {
    gameId: number;
    beatmapId: number;
    scores: {
      osuUserId: number;
      userId: string | null;
      userName: string | null;
      team: 'red' | 'blue' | null;
      score: number;
      mods: string[];
      maxCombo: number;
      accuracy: number;
      rank: string;
      great: number | null;
      ok: number | null;
      miss: number | null;
    }[];
  }[];
};

@Injectable()
export class OsuMultiplayerHistoryService {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async get(roomId: OsuRoomId): Promise<OsuMultiplayerHistory | null> {
    const [room] = await this.db
      .select({
        osuMatchId: osuMultiplayerRooms.osuMatchId,
        status: osuMultiplayerRooms.status,
        lastSyncedAt: osuMultiplayerRooms.lastSyncedAt,
      })
      .from(osuMultiplayerRooms)
      .where(eq(osuMultiplayerRooms.id, roomId))
      .limit(1);
    if (!room) return null;

    const rows = await this.db
      .select({
        gameId: osuMultiplayerGames.osuGameId,
        beatmapId: osuMultiplayerGames.osuBeatmapId,
        osuUserId: osuMultiplayerScores.osuUserId,
        userId: users.id,
        userName: users.osuUsername,
        team: osuMultiplayerScores.team,
        score: osuMultiplayerScores.score,
        mods: osuMultiplayerScores.mods,
        maxCombo: osuMultiplayerScores.maxCombo,
        accuracy: osuMultiplayerScores.accuracy,
        rank: osuMultiplayerScores.rank,
        great: osuMultiplayerScores.great,
        ok: osuMultiplayerScores.ok,
        miss: osuMultiplayerScores.miss,
      })
      .from(osuMultiplayerGames)
      .innerJoin(
        osuMultiplayerScores,
        and(
          eq(osuMultiplayerScores.roomId, osuMultiplayerGames.roomId),
          eq(osuMultiplayerScores.osuGameId, osuMultiplayerGames.osuGameId),
        ),
      )
      .leftJoin(users, eq(users.osuId, osuMultiplayerScores.osuUserId))
      .where(eq(osuMultiplayerGames.roomId, roomId))
      .orderBy(
        asc(osuMultiplayerGames.endedAt),
        asc(osuMultiplayerGames.osuGameId),
        asc(osuMultiplayerScores.osuUserId),
      );
    const games = new Map<number, OsuMultiplayerHistory['games'][number]>();

    for (const { gameId, beatmapId, ...score } of rows) {
      const game = games.get(gameId) ?? { gameId, beatmapId, scores: [] };
      game.scores.push(score);
      games.set(gameId, game);
    }

    return { ...room, games: [...games.values()] };
  }
}
