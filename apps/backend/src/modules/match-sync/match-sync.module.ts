import { Module } from '@nestjs/common';
import { OsuModule } from 'lib/infrastructure/osu/osu.module';
import { MatchSyncRepository } from './match-sync.repository';
import { MatchSyncScheduler } from './match-sync.scheduler';
import { MatchSyncService } from './match-sync.service';
import { OsuMatchClient } from './osu-match.client';
import { MatchSyncController } from './match-sync.controller';

@Module({
  imports: [OsuModule],
  controllers: [MatchSyncController],
  providers: [
    OsuMatchClient,
    MatchSyncRepository,
    MatchSyncService,
    MatchSyncScheduler,
  ],
  exports: [MatchSyncRepository, MatchSyncService],
})
export class MatchSyncModule {}
