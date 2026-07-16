import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { and, eq } from 'drizzle-orm';
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

  constructor(
    @Inject('DB') private readonly db: Schema,
    private readonly syncService: OsuMultiplayerSyncService,
  ) {}

  @Interval(5_000)
  public async tick(): Promise<void> {
    const rooms = await this.db
      .select({ roomId: matches.osuRoomId })
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
    const results = await Promise.allSettled(
      rooms.map(({ roomId }) => this.syncService.sync(roomId!)),
    );
    for (const result of results) {
      if (result.status === 'rejected') this.logger.error(result.reason);
    }
  }
}
