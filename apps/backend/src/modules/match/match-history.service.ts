import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  MatchException,
  MatchExceptionCode,
} from 'lib/domain/match/match.exception';
import { MatchId } from 'lib/domain/match/match.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { matches, Schema, stages } from 'lib/infrastructure/db';
import { OsuMultiplayerHistoryService } from 'modules/osu-multiplayer-sync/osu-multiplayer-history.service';
import { MatchHistoryDtoOutput } from './dto';
import { MatchResultService } from './match-result.service';
import { orderMatchHistoryScores } from './score';

@Injectable()
export class MatchHistoryService {
  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly roomHistory: OsuMultiplayerHistoryService,
    private readonly matchResults: MatchResultService,
  ) {}

  public async get(
    tournamentId: TournamentId,
    matchId: MatchId,
  ): Promise<MatchHistoryDtoOutput> {
    const [match] = await this.db
      .select({
        name: matches.name,
        osuRoomId: matches.osuRoomId,
        redTeamId: matches.redTeamId,
        blueTeamId: matches.blueTeamId,
      })
      .from(matches)
      .innerJoin(stages, eq(stages.id, matches.stageId))
      .where(
        and(eq(matches.id, matchId), eq(stages.tournamentId, tournamentId)),
      )
      .limit(1);

    if (!match) {
      throw new MatchException(
        'Match not found',
        MatchExceptionCode.MATCH_NOT_FOUND,
      );
    }

    const [history, result] = await Promise.all([
      match.osuRoomId ? this.roomHistory.get(match.osuRoomId) : null,
      this.matchResults.get(matchId),
    ]);
    const winner =
      result.redScore === null ||
      result.blueScore === null ||
      result.redScore === result.blueScore
        ? null
        : result.redScore > result.blueScore
          ? 'red'
          : 'blue';
    const teamIds =
      match.redTeamId && match.blueTeamId
        ? { red: match.redTeamId, blue: match.blueTeamId }
        : null;

    return {
      title: match.name,
      mpUrl: history
        ? `https://osu.ppy.sh/community/matches/${history.osuMatchId}`
        : null,
      syncStatus: history?.status ?? null,
      lastSyncedAt: history?.lastSyncedAt?.toISOString() ?? null,
      winner,
      games:
        history?.games.map((game) => ({
          gameId: game.gameId,
          beatmapId: game.beatmapId,
          scores: orderMatchHistoryScores(game.scores, teamIds),
        })) ?? [],
    };
  }
}
