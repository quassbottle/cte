import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, isNotNull } from 'drizzle-orm';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { StageId } from 'lib/domain/stage/stage.id';
import {
  osuMultiplayerRooms,
  qualificationLobbies,
  Schema,
} from 'lib/infrastructure/db';
import { OsuMultiplayerSyncService } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.service';
import { QualificationResultsService } from './qualification-results.service';

@Injectable()
export class QualificationSyncRepository {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async roomsByStage(): Promise<
    {
      stageId: StageId;
      roomId: OsuRoomId;
      status: 'active' | 'stopped' | 'completed';
    }[]
  > {
    const rows = await this.db
      .select({
        stageId: qualificationLobbies.stageId,
        roomId: qualificationLobbies.osuRoomId,
        status: osuMultiplayerRooms.status,
      })
      .from(qualificationLobbies)
      .innerJoin(
        osuMultiplayerRooms,
        eq(osuMultiplayerRooms.id, qualificationLobbies.osuRoomId),
      )
      .where(isNotNull(qualificationLobbies.osuRoomId));
    return rows as {
      stageId: StageId;
      roomId: OsuRoomId;
      status: 'active' | 'stopped' | 'completed';
    }[];
  }
}

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
