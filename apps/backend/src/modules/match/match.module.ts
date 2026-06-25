import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { ScheduleService } from './schedule.service';

@Module({
  providers: [MatchService, ScheduleService],
  exports: [MatchService, ScheduleService],
})
export class MatchModule {}
