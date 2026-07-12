import { Module } from '@nestjs/common';
import { MatchSyncModule } from 'modules/match-sync/match-sync.module';
import { MatchService } from './match.service';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [MatchSyncModule],
  providers: [MatchService, ScheduleService],
  exports: [MatchService, ScheduleService],
})
export class MatchModule {}
