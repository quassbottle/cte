import { Injectable } from '@nestjs/common';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import {
  QualificationResultsRepository,
  SetQualificationSeedParams,
} from './qualification-results.repository';
import { calculateQualificationSeeds } from './qualification-seeding';

@Injectable()
export class QualificationResultsService {
  constructor(private readonly repository: QualificationResultsRepository) {}

  public async recalculate(stageId: StageId) {
    await this.repository.recalculate(stageId);
  }

  public invalidate(stageId: StageId) {
    return this.repository.invalidate(stageId);
  }

  public setSeed(params: SetQualificationSeedParams) {
    return this.repository.setSeed(params);
  }

  public isStale(stageId: StageId) {
    return this.repository.isStale(stageId);
  }

  public async getBreakdown(stageId: StageId) {
    const input = await this.repository.load(stageId);
    return this.getBreakdownFromInput(input);
  }

  public async getStatistics(tournamentId: TournamentId) {
    const stageId = await this.repository.findStageId(tournamentId);
    const input = await this.repository.load(stageId);
    const competitors = new Map(
      input.competitors.map(
        (competitor) => [String(competitor.id), competitor] as const,
      ),
    );
    const breakdown = this.getBreakdownFromInput(input);
    return {
      maps: input.beatmaps.map(
        ({ osuBeatmapId, artist, title, difficultyName, mod, index }) => ({
          osuBeatmapId,
          artist,
          title,
          difficultyName,
          mod,
          index,
        }),
      ),
      competitors: breakdown
        .map(({ competitorId, seed, maps }) => ({
          id: competitorId,
          name: competitors.get(competitorId)?.name ?? '',
          seed: competitors.get(competitorId)?.seed ?? seed,
          maps: maps.map(({ osuBeatmapId, osuGameId, score, place }) => ({
            osuBeatmapId: osuBeatmapId!,
            gameId: osuGameId,
            score,
            place,
          })),
        }))
        .sort((left, right) => left.seed - right.seed),
    };
  }

  private getBreakdownFromInput(
    input: Awaited<ReturnType<QualificationResultsRepository['load']>>,
  ) {
    const competitors = new Map<string, readonly string[]>(
      input.competitors.map(
        (competitor) => [String(competitor.id), competitor.userIds] as const,
      ),
    );
    const osuBeatmapIds = new Map<string, number>(
      input.beatmaps.map((beatmap) => [
        beatmap.beatmapId,
        beatmap.osuBeatmapId,
      ]),
    );
    const results = calculateQualificationSeeds({
      beatmapIds: input.beatmapIds,
      attempts: input.attempts,
      competitors: input.competitors.map((competitor) => ({
        ...competitor,
        id: String(competitor.id),
      })),
    });
    return results.map((result) => ({
      ...result,
      userIds: competitors.get(result.competitorId) ?? [],
      maps: result.maps.map((map) => ({
        ...map,
        osuBeatmapId: osuBeatmapIds.get(map.beatmapId),
      })),
    }));
  }
}
