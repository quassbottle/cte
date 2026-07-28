import { Module } from '@nestjs/common';
import { OsuMultiplayerSyncModule } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.module';
import { MatchHistoryService } from './match-history.service';
import { MatchResultService } from './match-result.service';
import { MatchSyncScheduler } from './match-sync.scheduler';
import { MatchService } from './match.service';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [OsuMultiplayerSyncModule],
  providers: [
    MatchService,
    MatchHistoryService,
    MatchResultService,
    MatchSyncScheduler,
    ScheduleService,
  ],
  exports: [MatchService, MatchHistoryService, ScheduleService],
})
export class MatchModule {}
