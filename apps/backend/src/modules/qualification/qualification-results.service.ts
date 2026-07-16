import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, min, sql } from 'drizzle-orm';
import { StageId } from 'lib/domain/stage/stage.id';
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

@Injectable()
export class QualificationResultsRepository {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async load(stageId: StageId, db: Schema = this.db) {
    const stage = await db
      .select({ tournamentId: stages.tournamentId, isTeam: tournaments.isTeam })
      .from(stages)
      .innerJoin(tournaments, eq(tournaments.id, stages.tournamentId))
      .where(and(eq(stages.id, stageId), eq(stages.type, 'qualification')))
      .limit(1);
    if (!stage[0])
      throw new BadRequestException('Qualification stage not found');

    const [maps, attempts] = await Promise.all([
      db
        .select({ beatmapId: beatmaps.id })
        .from(mappools)
        .innerJoin(
          mappoolsBeatmaps,
          eq(mappoolsBeatmaps.mappoolId, mappools.id),
        )
        .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
        .where(eq(mappools.stageId, stageId)),
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
          .select({ id: users.id, tieBreakId: users.osuId })
          .from(soloParticipants)
          .innerJoin(users, eq(users.id, soloParticipants.userId))
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
        beatmapIds,
        attempts,
        competitors: competitors.map(({ id, tieBreakId }) => ({
          id,
          tieBreakId,
          userIds: [id],
        })),
        isTeam: false,
      };
    }

    const [members, assigned] = await Promise.all([
      db
        .select({ teamId: teams.id, userId: teamParticipants.userId })
        .from(teams)
        .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
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
    const byTeam = new Map<string, string[]>();
    for (const member of members) {
      byTeam.set(member.teamId, [
        ...(byTeam.get(member.teamId) ?? []),
        member.userId,
      ]);
    }
    const assignedIds = new Set(assigned.map(({ id }) => id));
    return {
      complete: [...byTeam.keys()].every((id) => assignedIds.has(id as never)),
      beatmapIds,
      attempts,
      competitors: [...byTeam].map(([id, userIds]) => ({
        id,
        tieBreakId: id,
        userIds,
      })),
      isTeam: true,
    };
  }

  public invalidate(stageId: StageId) {
    return this.db.transaction(async (tx) => {
      await lockQualificationStage(tx, stageId);
      await tx
        .delete(qualificationResults)
        .where(eq(qualificationResults.stageId, stageId));
    });
  }

  public recalculate(stageId: StageId) {
    return this.db.transaction(async (tx) => {
      await lockQualificationStage(tx, stageId);
      const input = await this.load(stageId, tx as Schema);
      if (!input.complete || !input.beatmapIds.length) return;
      const rows = calculateQualificationSeeds(input);
      await tx
        .delete(qualificationResults)
        .where(eq(qualificationResults.stageId, stageId));
      if (rows.length) {
        await tx.insert(qualificationResults).values(
          rows.map((row) => ({
            stageId,
            ...(input.isTeam
              ? { teamId: row.competitorId as never }
              : { userId: row.competitorId as never }),
            seed: row.seed,
            aggregateScore: row.totalScore,
          })),
        );
      }
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

@Injectable()
export class QualificationResultsService {
  constructor(private readonly repository: QualificationResultsRepository) {}

  public async recalculate(stageId: StageId) {
    await this.repository.recalculate(stageId);
  }

  public invalidate(stageId: StageId) {
    return this.repository.invalidate(stageId);
  }

  public isStale(stageId: StageId) {
    return this.repository.isStale(stageId);
  }
}
