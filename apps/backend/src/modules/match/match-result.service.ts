import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { MatchId } from 'lib/domain/match/match.id';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
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

type RawGame = {
  roomId: OsuRoomId;
  osuGameId: number;
  osuBeatmapId: number;
  endedAt: Date | null;
};

type RawScore = {
  roomId: OsuRoomId;
  osuGameId: number;
  osuUserId: number;
  score: number;
  team: 'red' | 'blue' | null;
};

const pending = (
  syncStatus: MatchResult['syncStatus'] = null,
  lastSyncedAt: Date | null = null,
): MatchResult => ({
  syncStatus,
  lastSyncedAt,
  redScore: null,
  blueScore: null,
  players: [],
});

@Injectable()
export class MatchResultService {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async get(matchId: MatchId): Promise<MatchResult> {
    return (await this.getMany([matchId])).get(matchId) ?? pending();
  }

  public async getMany(
    matchIds: MatchId[],
  ): Promise<Map<MatchId, MatchResult>> {
    if (!matchIds.length) return new Map();

    const matchRows = await this.db
      .select({
        matchId: matches.id,
        osuRoomId: matches.osuRoomId,
        redTeamId: matches.redTeamId,
        blueTeamId: matches.blueTeamId,
        status: osuMultiplayerRooms.status,
        lastSyncedAt: osuMultiplayerRooms.lastSyncedAt,
      })
      .from(matches)
      .leftJoin(
        osuMultiplayerRooms,
        eq(osuMultiplayerRooms.id, matches.osuRoomId),
      )
      .where(inArray(matches.id, matchIds));
    const roomIds = matchRows.flatMap(({ osuRoomId }) =>
      osuRoomId ? [osuRoomId] : [],
    );
    const playersPromise = this.db
      .select({
        matchId: matchParticipants.matchId,
        userId: users.id,
        osuId: users.osuId,
        osuUsername: users.osuUsername,
      })
      .from(matchParticipants)
      .innerJoin(users, eq(users.id, matchParticipants.userId))
      .where(inArray(matchParticipants.matchId, matchIds));
    const beatmapsPromise = this.db
      .select({
        matchId: matches.id,
        osuBeatmapId: beatmaps.osuBeatmapId,
      })
      .from(matches)
      .innerJoin(mappools, eq(mappools.stageId, matches.stageId))
      .innerJoin(mappoolsBeatmaps, eq(mappoolsBeatmaps.mappoolId, mappools.id))
      .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
      .where(inArray(matches.id, matchIds));
    const gamesPromise: Promise<RawGame[]> = roomIds.length
      ? this.db
          .select({
            roomId: osuMultiplayerGames.roomId,
            osuGameId: osuMultiplayerGames.osuGameId,
            osuBeatmapId: osuMultiplayerGames.osuBeatmapId,
            endedAt: osuMultiplayerGames.endedAt,
          })
          .from(osuMultiplayerGames)
          .where(inArray(osuMultiplayerGames.roomId, roomIds))
      : Promise.resolve([]);
    const scoresPromise: Promise<RawScore[]> = roomIds.length
      ? this.db
          .select({
            roomId: osuMultiplayerScores.roomId,
            osuGameId: osuMultiplayerScores.osuGameId,
            osuUserId: osuMultiplayerScores.osuUserId,
            score: osuMultiplayerScores.score,
            team: osuMultiplayerScores.team,
          })
          .from(osuMultiplayerScores)
          .where(inArray(osuMultiplayerScores.roomId, roomIds))
      : Promise.resolve([]);

    const [players, allowedBeatmaps, games, scores] = await Promise.all([
      playersPromise,
      beatmapsPromise,
      gamesPromise,
      scoresPromise,
    ]);

    return new Map(
      matchRows.map((match) => {
        const status = match.status ?? null;
        const lastSyncedAt = match.lastSyncedAt ?? null;
        const matchGames = games.filter(
          (game) => game.roomId === match.osuRoomId,
        );
        if (!match.osuRoomId || !lastSyncedAt || !matchGames.length) {
          return [match.matchId, pending(status, lastSyncedAt)];
        }

        const matchPlayers = players
          .filter((player) => player.matchId === match.matchId)
          .sort(
            (a, b) =>
              a.osuUsername.localeCompare(b.osuUsername) ||
              a.userId.localeCompare(b.userId),
          );
        const snapshot = {
          games: matchGames.map((game) => ({
            id: game.osuGameId,
            beatmapId: game.osuBeatmapId,
            endedAt: game.endedAt,
            scores: scores
              .filter(
                (score) =>
                  score.roomId === match.osuRoomId &&
                  score.osuGameId === game.osuGameId,
              )
              .map((score) => ({
                userId: score.osuUserId,
                score: score.score,
                team: score.team,
              })),
          })),
        };
        const allowedBeatmapIds = new Set(
          allowedBeatmaps
            .filter((beatmap) => beatmap.matchId === match.matchId)
            .map(({ osuBeatmapId }) => osuBeatmapId),
        );
        const points =
          match.redTeamId && match.blueTeamId
            ? calculateMatchPoints({
                kind: 'team',
                snapshot,
                allowedBeatmapIds,
              })
            : matchPlayers.length === 2
              ? calculateMatchPoints({
                  kind: 'solo',
                  snapshot,
                  allowedBeatmapIds,
                  playerOsuIds: [matchPlayers[0].osuId, matchPlayers[1].osuId],
                })
              : null;
        if (!points) return [match.matchId, pending(status, lastSyncedAt)];

        const tied = points.redScore === points.blueScore;
        return [
          match.matchId,
          {
            syncStatus: status,
            lastSyncedAt,
            ...points,
            players:
              match.redTeamId || match.blueTeamId
                ? []
                : matchPlayers.map((player, index) => ({
                    userId: player.userId,
                    score: index === 0 ? points.redScore : points.blueScore,
                    isWinner: tied
                      ? null
                      : index === 0
                        ? points.redScore > points.blueScore
                        : points.blueScore > points.redScore,
                  })),
          },
        ];
      }),
    );
  }
}
