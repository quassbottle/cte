import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { OsuMultiplayerSyncService } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.service';
import { QualificationResultsService } from './qualification-results.service';
import { QualificationSyncRepository } from './qualification-sync.repository';

@Injectable()
export class QualificationSyncScheduler {
  constructor(
    private readonly repository: QualificationSyncRepository,
    private readonly syncService: OsuMultiplayerSyncService,
    private readonly results: QualificationResultsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async sync() {
    const rows = await this.repository.roomsByStage();
    const stages = new Map<StageId, OsuRoomId[]>();
    for (const row of rows) {
      stages.set(row.stageId, [
        ...(stages.get(row.stageId) ?? []),
        ...(row.status === 'active' ? [row.roomId] : []),
      ]);
    }
    for (const [stageId, roomIds] of stages) {
      await Promise.all(roomIds.map((roomId) => this.syncService.sync(roomId)));
      if (await this.results.isStale(stageId)) {
        await this.results.recalculate(stageId);
      }
    }
  }
}
