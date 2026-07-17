import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { and, eq } from 'drizzle-orm';
import { EnvService } from 'lib/common/env/env.service';
import {
  matches,
  osuMultiplayerRooms,
  Schema,
  stages,
} from 'lib/infrastructure/db';
import { OsuMultiplayerSyncService } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.service';

@Injectable()
export class MatchSyncScheduler {
  private readonly logger = new Logger(MatchSyncScheduler.name);
  private running = false;

  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly syncService: OsuMultiplayerSyncService,
    private readonly env: EnvService,
  ) {}

  @Interval(5_000)
  public async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const rooms = await this.db
        .select({
          roomId: matches.osuRoomId,
          nextSyncAt: osuMultiplayerRooms.nextSyncAt,
        })
        .from(matches)
        .innerJoin(stages, eq(stages.id, matches.stageId))
        .innerJoin(
          osuMultiplayerRooms,
          eq(osuMultiplayerRooms.id, matches.osuRoomId),
        )
        .where(
          and(
            eq(stages.type, 'regular'),
            eq(osuMultiplayerRooms.status, 'active'),
          ),
        );
      const batch = rooms
        .filter(({ nextSyncAt }) => nextSyncAt <= now)
        .slice(0, this.env.get('OSU_MATCH_SYNC_BATCH_SIZE'));
      const results = await Promise.allSettled(
        batch.map(({ roomId }) => this.syncService.sync(roomId!)),
      );
      for (const result of results) {
        if (result.status === 'rejected') this.logger.error(result.reason);
      }
    } finally {
      this.running = false;
    }
  }
}
