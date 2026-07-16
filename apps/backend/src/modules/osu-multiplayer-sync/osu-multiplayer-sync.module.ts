import { Module } from '@nestjs/common';
import { OsuModule } from 'lib/infrastructure/osu/osu.module';
import { OsuMatchClient } from './osu-match.client';
import { OsuMultiplayerSyncRepository } from './osu-multiplayer-sync.repository';
import { OsuMultiplayerSyncService } from './osu-multiplayer-sync.service';

@Module({
  imports: [OsuModule],
  providers: [
    OsuMatchClient,
    OsuMultiplayerSyncRepository,
    OsuMultiplayerSyncService,
  ],
  exports: [OsuMatchClient, OsuMultiplayerSyncService],
})
export class OsuMultiplayerSyncModule {}
