import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matchParticipants,
  matches,
  osuMultiplayerGames,
  osuMultiplayerScores,
  Schema,
  soloParticipants,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import { QualificationResultsService } from 'modules/qualification/qualification-results.service';
import { StageService } from './stage.service';

type Query = { sortBeatmapId?: number; sortDirection: 'asc' | 'desc' };
type AttemptRow = {
  competitorId: string;
  osuBeatmapId: number;
  gameId: string | number;
  matchId: string;
  score: string | number;
  place: string | number;
};

@Injectable()
export class StageStatisticsService {
  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly stagesService: StageService,
    private readonly qualificationResults: QualificationResultsService,
  ) {}

  public async get(tournamentId: TournamentId, stageId: StageId, query: Query) {
    const stage = await this.stagesService.getById({
      id: stageId,
      tournamentId,
    });
    if (stage.type === 'qualification')
      return this.qualificationResults.getStatisticsByStage(stageId, query);

    const [{ isTeam }] = await this.db
      .select({ isTeam: tournaments.isTeam })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));
    const maps = await this.db
      .select({
        osuBeatmapId: beatmaps.osuBeatmapId,
        osuBeatmapsetId: beatmaps.osuBeatmapsetId,
        artist: beatmaps.artist,
        title: beatmaps.title,
        difficultyName: beatmaps.difficultyName,
        mod: mappoolsBeatmaps.mod,
        index: mappoolsBeatmaps.index,
      })
      .from(mappools)
      .innerJoin(mappoolsBeatmaps, eq(mappoolsBeatmaps.mappoolId, mappools.id))
      .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
      .where(eq(mappools.stageId, stageId))
      .orderBy(
        asc(mappoolsBeatmaps.position),
        asc(mappoolsBeatmaps.createdAt),
      );

    const direction = query.sortDirection === 'desc' ? sql`desc` : sql`asc`;
    const sortBeatmapId = query.sortBeatmapId ?? null;
    const attemptsQuery = isTeam
      ? sql`
          with attempts as (
            select case ${osuMultiplayerScores.team}
                     when 'red' then ${matches.redTeamId}
                     when 'blue' then ${matches.blueTeamId}
                   end as "competitorId",
                   ${osuMultiplayerScores.osuBeatmapId} as "osuBeatmapId",
                   ${osuMultiplayerScores.osuGameId} as "gameId",
                   ${matches.id} as "matchId",
                   sum(${osuMultiplayerScores.score})::bigint as score
            from ${matches}
            join ${osuMultiplayerGames}
              on ${osuMultiplayerGames.roomId} = ${matches.osuRoomId}
            join ${osuMultiplayerScores}
              on ${osuMultiplayerScores.roomId} = ${osuMultiplayerGames.roomId}
             and ${osuMultiplayerScores.osuGameId} = ${osuMultiplayerGames.osuGameId}
            where ${matches.stageId} = ${stageId}
            group by "competitorId", ${osuMultiplayerScores.osuBeatmapId},
                     ${osuMultiplayerScores.osuGameId}, ${matches.id}
          )
          select *, rank() over (
            partition by "osuBeatmapId" order by score desc
          )::int as place
          from attempts
          where "competitorId" is not null
          order by "osuBeatmapId", score desc, "matchId"`
      : sql`
          with attempts as (
            select ${users.id} as "competitorId",
                   ${osuMultiplayerScores.osuBeatmapId} as "osuBeatmapId",
                   ${osuMultiplayerScores.osuGameId} as "gameId",
                   ${matches.id} as "matchId",
                   ${osuMultiplayerScores.score}::bigint as score
            from ${matches}
            join ${osuMultiplayerGames}
              on ${osuMultiplayerGames.roomId} = ${matches.osuRoomId}
            join ${osuMultiplayerScores}
              on ${osuMultiplayerScores.roomId} = ${osuMultiplayerGames.roomId}
             and ${osuMultiplayerScores.osuGameId} = ${osuMultiplayerGames.osuGameId}
            join ${users} on ${users.osuId} = ${osuMultiplayerScores.osuUserId}
            where ${matches.stageId} = ${stageId}
          )
          select *, rank() over (
            partition by "osuBeatmapId" order by score desc
          )::int as place
          from attempts
          order by "osuBeatmapId", score desc, "matchId"`;
    const attempts = (await this.db.execute(attemptsQuery))
      .rows as AttemptRow[];

    const bestScore = sql`
      coalesce((
        select max(candidate.score)
        from (
          select sum(s.score) as score
          from ${matches} m
          join ${osuMultiplayerScores} s on s.room_id = m.osu_room_id
          where m.stage_id = ${stageId}
            and s.osu_beatmap_id = ${sortBeatmapId}
            and ${
              isTeam
                ? sql`case s.team when 'red' then m.red_team_id when 'blue' then m.blue_team_id end = competitor.id`
                : sql`s.osu_user_id = competitor.osu_id`
            }
          group by m.id, s.osu_game_id
        ) candidate
      ), 0)`;
    const competitors = isTeam
      ? await this.db.execute<{ id: string; name: string }>(sql`
          select competitor.id, competitor.name
          from ${teams} competitor
          where competitor.tournament_id = ${tournamentId}
            and competitor.withdrawn = false
            and competitor.id in (
              select ${matches.redTeamId} from ${matches}
              where ${matches.stageId} = ${stageId}
              union
              select ${matches.blueTeamId} from ${matches}
              where ${matches.stageId} = ${stageId}
            )
          order by ${
            sortBeatmapId === null
              ? sql`competitor.name ${direction}`
              : sql`${bestScore} ${direction}, competitor.name asc`
          }`)
      : await this.db.execute<{ id: string; name: string }>(sql`
          select competitor.id, competitor.osu_username as name
          from ${soloParticipants}
          join ${users} competitor on competitor.id = ${soloParticipants.userId}
          where ${soloParticipants.tournamentId} = ${tournamentId}
            and ${soloParticipants.withdrawn} = false
            and competitor.id in (
              select ${matchParticipants.userId}
              from ${matchParticipants}
              join ${matches}
                on ${matches.id} = ${matchParticipants.matchId}
              where ${matches.stageId} = ${stageId}
            )
          order by ${
            sortBeatmapId === null
              ? sql`competitor.osu_username ${direction}`
              : sql`${bestScore} ${direction}, competitor.osu_username asc`
          }`);

    return {
      stageId,
      maps: maps.map(({ osuBeatmapsetId, ...map }) => ({
        ...map,
        coverUrl: `https://assets.ppy.sh/beatmaps/${osuBeatmapsetId}/covers/cover@2x.jpg`,
      })),
      competitors: competitors.rows.map((competitor) => ({
        ...competitor,
        maps: maps.map(({ osuBeatmapId }) => ({
          osuBeatmapId,
          attempts: attempts
            .filter(
              (attempt) =>
                attempt.competitorId === competitor.id &&
                Number(attempt.osuBeatmapId) === osuBeatmapId,
            )
            .map((attempt) => ({
              gameId: Number(attempt.gameId),
              matchId: attempt.matchId,
              score: Number(attempt.score),
              place: Number(attempt.place),
            })),
        })),
      })),
    };
  }
}
