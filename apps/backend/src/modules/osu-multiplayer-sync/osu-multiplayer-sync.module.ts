import { Module } from '@nestjs/common';
import { OsuModule } from 'lib/infrastructure/osu/osu.module';
import { OsuMatchClient } from './osu-match.client';
import { OsuMultiplayerHistoryService } from './osu-multiplayer-history.service';
import { OsuMultiplayerSyncRepository } from './osu-multiplayer-sync.repository';
import { OsuMultiplayerSyncService } from './osu-multiplayer-sync.service';

@Module({
  imports: [OsuModule],
  providers: [
    OsuMatchClient,
    OsuMultiplayerHistoryService,
    OsuMultiplayerSyncRepository,
    OsuMultiplayerSyncService,
  ],
  exports: [
    OsuMatchClient,
    OsuMultiplayerHistoryService,
    OsuMultiplayerSyncService,
  ],
})
export class OsuMultiplayerSyncModule {}
