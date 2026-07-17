import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnvService } from 'lib/common/env/env.service';
import { StageId } from 'lib/domain/stage/stage.id';
import { OsuMultiplayerSyncService } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.service';
import { QualificationResultsService } from './qualification-results.service';
import { QualificationSyncRepository } from './qualification-sync.repository';

@Injectable()
export class QualificationSyncScheduler {
  private running = false;

  constructor(
    private readonly repository: QualificationSyncRepository,
    private readonly syncService: OsuMultiplayerSyncService,
    private readonly results: QualificationResultsService,
    private readonly env: EnvService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async sync() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.repository.roomsByStage();
      const stages = new Map<StageId, typeof rows>();
      for (const row of rows) {
        stages.set(row.stageId, [...(stages.get(row.stageId) ?? []), row]);
      }
      let remaining = this.env.get('OSU_MATCH_SYNC_BATCH_SIZE');
      const now = new Date();
      for (const [stageId, stageRooms] of stages) {
        const due = stageRooms.filter(
          ({ status, nextSyncAt }) => status === 'active' && nextSyncAt <= now,
        );
        const batch = due.slice(0, remaining);
        const synced = await Promise.allSettled(
          batch.map(({ roomId }) => this.syncService.sync(roomId)),
        );
        const failure = synced.find(({ status }) => status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        remaining -= batch.length;
        if (batch.length < due.length) continue;
        if (await this.results.isStale(stageId)) {
          await this.results.recalculate(stageId);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
