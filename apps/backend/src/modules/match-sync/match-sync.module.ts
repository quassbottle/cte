import { Module } from '@nestjs/common';
import { OsuModule } from 'lib/infrastructure/osu/osu.module';
import { AuthModule } from 'modules/auth/auth.module';
import { MatchSyncRepository } from './match-sync.repository';
import { MatchSyncService } from './match-sync.service';
import { OsuMatchClient } from './osu-match.client';

@Module({
  imports: [AuthModule, OsuModule],
  providers: [
    OsuMatchClient,
    MatchSyncRepository,
    MatchSyncService,
  ],
  exports: [MatchSyncRepository, MatchSyncService],
})
export class MatchSyncModule {}
