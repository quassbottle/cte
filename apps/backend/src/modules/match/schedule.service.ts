import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm/alias';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { Schema, stages } from 'lib/infrastructure/db';
import { StageScheduleInput } from './dto';

const stageRow = aliasedTable(stages, 'stage_row');
const stageRowId = sql.raw('"stage_row"."id"');
const stageRowTournamentId = sql.raw('"stage_row"."tournament_id"');

@Injectable()
export class ScheduleService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async findByTournament(params: {
    tournamentId: TournamentId;
  }): Promise<StageScheduleInput[]> {
    const { tournamentId } = params;

    const schedule = await this.drizzle
      .select({
        id: stageRow.id,
        name: stageRow.name,
        type: stageRow.type,
        startsAt: stageRow.startsAt,
        endsAt: stageRow.endsAt,
        matches: sql<StageScheduleInput['matches']>`
          coalesce(
            (
              select json_agg(
                json_build_object(
                  'id', match_row.id,
                  'name', match_row.name,
                  'matchNumber', match_row.match_number,
                  'startsAt', match_row.starts_at,
                  'endsAt', match_row.ends_at,
                  'mpUrl', match_row.mp_url,
                  'vodUrl', match_row.vod_url,
                  'syncStatus', (
                    select sync_row.status
                    from match_osu_sync sync_row
                    where sync_row.match_id = match_row.id
                  ),
                  'lastSyncedAt', (
                    select sync_row.last_synced_at
                    from match_osu_sync sync_row
                    where sync_row.match_id = match_row.id
                  ),
                  'redTeam', (
                    select json_build_object('id', red_team.id, 'name', red_team.name)
                    from teams red_team
                    where red_team.id = match_row.red_team_id
                  ),
                  'blueTeam', (
                    select json_build_object('id', blue_team.id, 'name', blue_team.name)
                    from teams blue_team
                    where blue_team.id = match_row.blue_team_id
                  ),
                  'redScore', match_row.red_score,
                  'blueScore', match_row.blue_score,
                  'players', coalesce(
                    (
                      select json_agg(
                        json_build_object(
                          'id', player_user.id,
                          'osuId', player_user.osu_id,
                          'osuUsername', player_user.osu_username,
                          'avatarUrl', concat('https://a.ppy.sh/', player_user.osu_id),
                          'countryCode', player_user.country_code,
                          'seed', (
                            select solo_seed.seed
                            from solo_participants solo_seed
                            where solo_seed.tournament_id = ${stageRowTournamentId}
                              and solo_seed.user_id = player_user.id
                            limit 1
                          ),
                          'score', match_player.score,
                          'isWinner', match_player.is_winner
                        )
                        order by
                          (
                            select solo_seed.seed
                            from solo_participants solo_seed
                            where solo_seed.tournament_id = ${stageRowTournamentId}
                              and solo_seed.user_id = player_user.id
                            limit 1
                          ) asc nulls last,
                          player_user.osu_username asc
                      )
                      from match_participants match_player
                      inner join users player_user on player_user.id = match_player.user_id
                      where match_player.match_id = match_row.id
                    ),
                    '[]'::json
                  ),
                  'staff', coalesce(
                    (
                      select json_agg(
                        json_build_object(
                          'id', staff_user.id,
                          'osuId', staff_user.osu_id,
                          'osuUsername', staff_user.osu_username,
                          'avatarUrl', concat('https://a.ppy.sh/', staff_user.osu_id),
                          'role', match_staff_row.role
                        )
                        order by
                          case match_staff_row.role
                            when 'referee' then 0
                            when 'streamer' then 1
                            when 'commentator' then 2
                            else 3
                          end,
                          staff_user.osu_username asc
                      )
                      from match_staff match_staff_row
                      inner join users staff_user on staff_user.id = match_staff_row.user_id
                      where match_staff_row.match_id = match_row.id
                    ),
                    '[]'::json
                  )
                )
                order by match_row.starts_at asc, match_row.match_number asc nulls last
              )
              from matches match_row
              where match_row.stage_id = ${stageRowId}
            ),
            '[]'::json
          )
        `,
      })
      .from(stageRow)
      .where(
        and(
          eq(stageRow.tournamentId, tournamentId),
          isNull(stageRow.deletedAt),
        ),
      )
      .orderBy(asc(stageRow.startsAt));

    return schedule;
  }
}
