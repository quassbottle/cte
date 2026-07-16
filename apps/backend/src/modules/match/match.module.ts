import { Module } from '@nestjs/common';
import { OsuMultiplayerSyncModule } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.module';
import { MatchResultService } from './match-result.service';
import { MatchService } from './match.service';
import { MatchSyncScheduler } from './match-sync.scheduler';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [OsuMultiplayerSyncModule],
  providers: [MatchService, MatchResultService, MatchSyncScheduler, ScheduleService],
  exports: [MatchService, ScheduleService],
})
export class MatchModule {}
