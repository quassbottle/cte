import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  osuMultiplayerGames,
  osuMultiplayerScores,
  qualificationLobbies,
  Schema,
  soloParticipants,
  teamParticipants,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import { beatmapCoverUrl } from 'lib/infrastructure/osu/beatmap-cover-url';
import { QualificationResultsService } from 'modules/qualification/qualification-results.service';
import { StageService } from './stage.service';

type Query = {
  view?: 'teams' | 'players';
  sortBeatmapId?: number;
  sortDirection: 'asc' | 'desc';
};
type AttemptRow = {
  competitorId: string;
  osuBeatmapId: number;
  gameId: string | number;
  matchId: string | null;
  lobbyId?: string | null;
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
    const [{ isTeam }] = await this.db
      .select({ isTeam: tournaments.isTeam })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));
    const playerView = !isTeam || query.view === 'players';
    if (stage.type === 'qualification' && !playerView)
      return this.qualificationResults.getStatisticsByStage(stageId, query);

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
      .orderBy(asc(mappoolsBeatmaps.position), asc(mappoolsBeatmaps.createdAt));

    const direction = query.sortDirection === 'desc' ? sql`desc` : sql`asc`;
    const sortBeatmapId = query.sortBeatmapId ?? null;
    const eligiblePlayer = isTeam
      ? sql`exists (
          select 1
          from ${teamParticipants} participant
          join ${teams} team on team.id = participant.team_id
          where participant.user_id = ${users.id}
            and participant.withdrawn = false
            and team.tournament_id = ${tournamentId}
            and team.withdrawn = false
        )`
      : sql`exists (
          select 1
          from ${soloParticipants} participant
          where participant.user_id = ${users.id}
            and participant.tournament_id = ${tournamentId}
            and participant.withdrawn = false
        )`;
    const attemptsQuery = playerView
      ? sql`
          with stage_rooms as (
            select ${matches.osuRoomId} as "roomId",
                   ${matches.id} as "matchId",
                   null::text as "lobbyId"
            from ${matches}
            where ${matches.stageId} = ${stageId}
            union all
            select ${qualificationLobbies.osuRoomId} as "roomId",
                   null::text as "matchId",
                   ${qualificationLobbies.id} as "lobbyId"
            from ${qualificationLobbies}
            where ${qualificationLobbies.stageId} = ${stageId}
              and ${qualificationLobbies.osuRoomId} is not null
          ), attempts as (
            select ${users.id} as "competitorId",
                   ${osuMultiplayerScores.osuBeatmapId} as "osuBeatmapId",
                   ${osuMultiplayerScores.osuGameId} as "gameId",
                   stage_rooms."matchId" as "matchId",
                   stage_rooms."lobbyId" as "lobbyId",
                   ${osuMultiplayerScores.score}::bigint as score
            from stage_rooms
            join ${osuMultiplayerScores}
              on ${osuMultiplayerScores.roomId} = stage_rooms."roomId"
            join ${users} on ${users.osuId} = ${osuMultiplayerScores.osuUserId}
            where ${eligiblePlayer}
          )
          select *, rank() over (
            partition by "osuBeatmapId" order by score desc
          )::int as place
          from attempts
          order by "osuBeatmapId", score desc, "gameId"`
      : sql`
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
          order by "osuBeatmapId", score desc, "matchId"`;
    const attempts = (await this.db.execute(attemptsQuery))
      .rows as AttemptRow[];

    const bestScore = playerView
      ? sql`
          coalesce((
            select max(s.score)
            from ${osuMultiplayerScores} s
            where s.osu_beatmap_id = ${sortBeatmapId}
              and s.osu_user_id = competitor.osu_id
              and (
                exists (
                  select 1 from ${matches} m
                  where m.stage_id = ${stageId}
                    and m.osu_room_id = s.room_id
                )
                or exists (
                  select 1 from ${qualificationLobbies} q
                  where q.stage_id = ${stageId}
                    and q.osu_room_id = s.room_id
                )
              )
          ), 0)`
      : sql`
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
    const competitors = !playerView
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
      : await this.db.execute<{
          id: string;
          name: string;
          teamName: string | null;
        }>(sql`
          select competitor.id,
                 competitor.osu_username as name,
                 (
                   select team.name
                   from ${teamParticipants} participant
                   join ${teams} team on team.id = participant.team_id
                   where participant.user_id = competitor.id
                     and participant.withdrawn = false
                     and team.tournament_id = ${tournamentId}
                     and team.withdrawn = false
                   limit 1
                 ) as "teamName"
          from ${users} competitor
          where ${
            isTeam
              ? sql`exists (
                  select 1
                  from ${teamParticipants} participant
                  join ${teams} team on team.id = participant.team_id
                  where participant.user_id = competitor.id
                    and participant.withdrawn = false
                    and team.tournament_id = ${tournamentId}
                    and team.withdrawn = false
                )`
              : sql`exists (
                  select 1
                  from ${soloParticipants} participant
                  where participant.user_id = competitor.id
                    and participant.tournament_id = ${tournamentId}
                    and participant.withdrawn = false
                )`
          }
            and exists (
            select 1
            from ${osuMultiplayerScores} score
            where score.osu_user_id = competitor.osu_id
              and (
                exists (
                  select 1 from ${matches} stage_match
                  where stage_match.stage_id = ${stageId}
                    and stage_match.osu_room_id = score.room_id
                )
                or exists (
                  select 1 from ${qualificationLobbies} lobby
                  where lobby.stage_id = ${stageId}
                    and lobby.osu_room_id = score.room_id
                )
              )
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
        coverUrl: beatmapCoverUrl(osuBeatmapsetId),
      })),
      competitors: competitors.rows.map((competitor) => {
        const teamName =
          'teamName' in competitor && typeof competitor.teamName === 'string'
            ? competitor.teamName
            : undefined;
        return {
          id: competitor.id,
          name: competitor.name,
          ...(teamName ? { teamName } : {}),
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
                ...(attempt.lobbyId ? { lobbyId: attempt.lobbyId } : {}),
                score: Number(attempt.score),
                place: Number(attempt.place),
              })),
          })),
        };
      }),
    };
  }
}
