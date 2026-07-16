import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { MatchId } from 'lib/domain/match/match.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  matchParticipants,
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
  Schema,
  users,
} from 'lib/infrastructure/db';
import { calculateMatchPoints } from './score';

export type MatchResult = {
  syncStatus: 'active' | 'stopped' | 'completed' | null;
  lastSyncedAt: Date | null;
  redScore: number | null;
  blueScore: number | null;
  players: { userId: string; score: number; isWinner: boolean | null }[];
};

const pending = (): MatchResult => ({
  syncStatus: null,
  lastSyncedAt: null,
  redScore: null,
  blueScore: null,
  players: [],
});

@Injectable()
export class MatchResultService {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async get(matchId: MatchId): Promise<MatchResult> {
    const match = await this.db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });
    if (!match?.osuRoomId) return pending();

    const room = await this.db.query.osuMultiplayerRooms.findFirst({
      where: eq(osuMultiplayerRooms.id, match.osuRoomId),
    });
    if (!room?.lastSyncedAt) return pending();

    const [players, allowedBeatmaps, games, scores] = await Promise.all([
      this.db
        .select({ userId: users.id, osuId: users.osuId })
        .from(matchParticipants)
        .innerJoin(users, eq(users.id, matchParticipants.userId))
        .where(eq(matchParticipants.matchId, matchId)),
      this.db
        .select({ osuBeatmapId: beatmaps.osuBeatmapId })
        .from(matches)
        .innerJoin(mappools, eq(mappools.stageId, matches.stageId))
        .innerJoin(
          mappoolsBeatmaps,
          eq(mappoolsBeatmaps.mappoolId, mappools.id),
        )
        .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
        .where(eq(matches.id, matchId)),
      this.db
        .select({
          osuGameId: osuMultiplayerGames.osuGameId,
          osuBeatmapId: osuMultiplayerGames.osuBeatmapId,
          endedAt: osuMultiplayerGames.endedAt,
        })
        .from(osuMultiplayerGames)
        .where(eq(osuMultiplayerGames.roomId, match.osuRoomId)),
      this.db
        .select({
          osuGameId: osuMultiplayerScores.osuGameId,
          osuUserId: osuMultiplayerScores.osuUserId,
          score: osuMultiplayerScores.score,
          team: osuMultiplayerScores.team,
        })
        .from(osuMultiplayerScores)
        .where(eq(osuMultiplayerScores.roomId, match.osuRoomId)),
    ]);

    if (!games.length) return { ...pending(), syncStatus: room.status, lastSyncedAt: room.lastSyncedAt };

    const snapshot = {
      games: games.map((game) => ({
        id: game.osuGameId,
        beatmapId: game.osuBeatmapId,
        endedAt: game.endedAt,
        scores: scores
          .filter((score) => score.osuGameId === game.osuGameId)
          .map((score) => ({
            userId: score.osuUserId,
            score: score.score,
            team: score.team,
          })),
      })),
    };
    const allowedBeatmapIds = new Set(
      allowedBeatmaps.map(({ osuBeatmapId }) => osuBeatmapId),
    );
    const points =
      match.redTeamId && match.blueTeamId
        ? calculateMatchPoints({ kind: 'team', snapshot, allowedBeatmapIds })
        : players.length === 2
          ? calculateMatchPoints({
              kind: 'solo',
              snapshot,
              allowedBeatmapIds,
              playerOsuIds: [players[0].osuId, players[1].osuId],
            })
          : null;
    if (!points) return { ...pending(), syncStatus: room.status, lastSyncedAt: room.lastSyncedAt };

    const tied = points.redScore === points.blueScore;
    return {
      syncStatus: room.status,
      lastSyncedAt: room.lastSyncedAt,
      ...points,
      players:
        match.redTeamId || match.blueTeamId
          ? []
          : players.map((player, index) => ({
              userId: player.userId,
              score: index === 0 ? points.redScore : points.blueScore,
              isWinner: tied
                ? null
                : index === 0
                  ? points.redScore > points.blueScore
                  : points.blueScore > points.redScore,
            })),
    };
  }
}
