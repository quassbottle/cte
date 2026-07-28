import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { QualificationModule } from 'modules/qualification/qualification.module';
import { StageStatisticsService } from './stage-statistics.service';
import { StageController } from './stage.controller';
import { StageService } from './stage.service';

@Module({
  imports: [AuthModule, QualificationModule],
  controllers: [StageController],
  providers: [StageService, StageStatisticsService],
  exports: [StageService],
})
export class StageModule {}
