import { Inject, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { and, asc, eq, isNull, min, sql } from 'drizzle-orm';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  osuMultiplayerRooms,
  osuMultiplayerScores,
  qualificationLobbies,
  qualificationLobbyPlayers,
  qualificationLobbyTeams,
  qualificationResults,
  Schema,
  soloParticipants,
  stages,
  teamParticipants,
  teams,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import { calculateQualificationSeeds } from './qualification-seeding';
import { lockQualificationStage } from './qualification-stage.lock';

export type SetQualificationSeedParams = {
  stageId: StageId;
  seed: number | null;
} & ({ userId: UserId } | { teamId: TeamId });

@Injectable()
export class QualificationResultsRepository {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async findStageId(tournamentId: TournamentId): Promise<StageId> {
    const [stage] = await this.db
      .select({ id: stages.id })
      .from(stages)
      .innerJoin(tournaments, eq(tournaments.id, stages.tournamentId))
      .where(
        and(
          eq(stages.tournamentId, tournamentId),
          eq(stages.type, 'qualification'),
          isNull(stages.deletedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .limit(1);
    if (!stage)
      throw new StageException(
        'Qualification stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    return stage.id;
  }

  public async load(stageId: StageId, db: Schema = this.db) {
    const stage = await db
      .select({ tournamentId: stages.tournamentId, isTeam: tournaments.isTeam })
      .from(stages)
      .innerJoin(tournaments, eq(tournaments.id, stages.tournamentId))
      .where(
        and(
          eq(stages.id, stageId),
          eq(stages.type, 'qualification'),
          isNull(stages.deletedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .limit(1);
    if (!stage[0])
      throw new StageException(
        'Qualification stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );

    const [maps, attempts] = await Promise.all([
      db
        .select({
          beatmapId: beatmaps.id,
          osuBeatmapId: beatmaps.osuBeatmapId,
          artist: beatmaps.artist,
          title: beatmaps.title,
          difficultyName: beatmaps.difficultyName,
          mod: mappoolsBeatmaps.mod,
          index: mappoolsBeatmaps.index,
        })
        .from(mappools)
        .innerJoin(
          mappoolsBeatmaps,
          eq(mappoolsBeatmaps.mappoolId, mappools.id),
        )
        .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
        .where(eq(mappools.stageId, stageId))
        .orderBy(
          asc(mappoolsBeatmaps.position),
          asc(mappoolsBeatmaps.createdAt),
        ),
      db
        .select({
          osuGameId: osuMultiplayerScores.osuGameId,
          beatmapId: beatmaps.id,
          userId: users.id,
          score: osuMultiplayerScores.score,
        })
        .from(qualificationLobbies)
        .innerJoin(
          osuMultiplayerScores,
          eq(osuMultiplayerScores.roomId, qualificationLobbies.osuRoomId),
        )
        .innerJoin(users, eq(users.osuId, osuMultiplayerScores.osuUserId))
        .innerJoin(
          beatmaps,
          eq(beatmaps.osuBeatmapId, osuMultiplayerScores.osuBeatmapId),
        )
        .where(eq(qualificationLobbies.stageId, stageId)),
    ]);
    const beatmapIds = maps.map(({ beatmapId }) => beatmapId);

    if (!stage[0].isTeam) {
      const [competitors, assigned] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.osuUsername,
            tieBreakId: users.osuId,
            seed: qualificationResults.seed,
          })
          .from(soloParticipants)
          .innerJoin(users, eq(users.id, soloParticipants.userId))
          .leftJoin(
            qualificationResults,
            and(
              eq(qualificationResults.stageId, stageId),
              eq(qualificationResults.userId, soloParticipants.userId),
            ),
          )
          .where(
            and(
              eq(soloParticipants.tournamentId, stage[0].tournamentId),
              eq(soloParticipants.withdrawn, false),
            ),
          ),
        db
          .select({ id: qualificationLobbyPlayers.userId })
          .from(qualificationLobbyPlayers)
          .where(eq(qualificationLobbyPlayers.stageId, stageId)),
      ]);
      const assignedIds = new Set(assigned.map(({ id }) => id));
      return {
        complete: competitors.every(({ id }) => assignedIds.has(id)),
        beatmaps: maps,
        beatmapIds,
        attempts,
        competitors: competitors.map(({ id, name, tieBreakId, seed }) => ({
          id,
          name,
          seed,
          tieBreakId,
          userIds: [id],
        })),
        isTeam: false as const,
      };
    }

    const [members, assigned] = await Promise.all([
      db
        .select({
          teamId: teams.id,
          name: teams.name,
          userId: teamParticipants.userId,
          seed: qualificationResults.seed,
        })
        .from(teams)
        .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
        .leftJoin(
          qualificationResults,
          and(
            eq(qualificationResults.stageId, stageId),
            eq(qualificationResults.teamId, teams.id),
          ),
        )
        .where(
          and(
            eq(teams.tournamentId, stage[0].tournamentId),
            eq(teams.withdrawn, false),
            eq(teamParticipants.withdrawn, false),
          ),
        ),
      db
        .select({ id: qualificationLobbyTeams.teamId })
        .from(qualificationLobbyTeams)
        .where(eq(qualificationLobbyTeams.stageId, stageId)),
    ]);
    const byTeam = new Map<
      TeamId,
      { name: string; seed: number | null; userIds: UserId[] }
    >();
    for (const member of members) {
      const team = byTeam.get(member.teamId) ?? {
        name: member.name,
        seed: member.seed,
        userIds: [],
      };
      team.userIds.push(member.userId);
      byTeam.set(member.teamId, team);
    }
    const assignedIds = new Set(assigned.map(({ id }) => id));
    return {
      complete: [...byTeam.keys()].every((id) => assignedIds.has(id)),
      beatmaps: maps,
      beatmapIds,
      attempts,
      competitors: [...byTeam].map(([id, { name, seed, userIds }]) => ({
        id,
        name,
        seed,
        tieBreakId: id,
        userIds,
      })),
      isTeam: true as const,
    };
  }

  public invalidate(stageId: StageId) {
    return this.db.transaction(async (tx) => {
      await lockQualificationStage(tx, stageId);
      await tx
        .update(qualificationResults)
        .set({ calculatedAt: null })
        .where(eq(qualificationResults.stageId, stageId));
    });
  }

  public setSeed(params: SetQualificationSeedParams) {
    return this.db.transaction(async (tx) => {
      await lockQualificationStage(tx, params.stageId);
      let competitorData: { userId: UserId } | { teamId: TeamId };
      let competitor: SQL;
      if ('userId' in params) {
        competitorData = { userId: params.userId };
        competitor = eq(qualificationResults.userId, params.userId);
      } else {
        competitorData = { teamId: params.teamId };
        competitor = eq(qualificationResults.teamId, params.teamId);
      }
      const where = and(
        eq(qualificationResults.stageId, params.stageId),
        competitor,
      );

      if (params.seed === null) {
        await tx.delete(qualificationResults).where(where);
        return;
      }

      const [updated] = await tx
        .update(qualificationResults)
        .set({ seed: params.seed, calculatedAt: new Date() })
        .where(where)
        .returning();
      if (!updated) {
        await tx.insert(qualificationResults).values({
          stageId: params.stageId,
          ...competitorData,
          seed: params.seed,
          aggregateScore: 0,
        });
      }
    });
  }

  public recalculate(stageId: StageId) {
    return this.db.transaction(async (tx) => {
      await lockQualificationStage(tx, stageId);
      const input = await this.load(stageId, tx as Schema);
      if (!input.complete || !input.beatmapIds.length) return;
      const rows = input.isTeam
        ? calculateQualificationSeeds(input).map((row) => ({
            stageId,
            teamId: row.competitorId,
            seed: row.seed,
            aggregateScore: row.totalScore,
          }))
        : calculateQualificationSeeds(input).map((row) => ({
            stageId,
            userId: row.competitorId,
            seed: row.seed,
            aggregateScore: row.totalScore,
          }));
      if (!rows.length) return;
      await tx
        .delete(qualificationResults)
        .where(eq(qualificationResults.stageId, stageId));
      await tx.insert(qualificationResults).values(rows);
    });
  }

  public async isStale(stageId: StageId) {
    const [row] = await this.db
      .select({
        calculatedAt: min(qualificationResults.calculatedAt),
        changedAt: sql<Date | null>`max(${osuMultiplayerRooms.lastDataChangedAt})`,
      })
      .from(qualificationLobbies)
      .leftJoin(qualificationResults, eq(qualificationResults.stageId, stageId))
      .leftJoin(
        osuMultiplayerRooms,
        eq(osuMultiplayerRooms.id, qualificationLobbies.osuRoomId),
      )
      .where(eq(qualificationLobbies.stageId, stageId));
    return (
      !row?.calculatedAt ||
      (!!row.changedAt && row.calculatedAt < row.changedAt)
    );
  }
}
