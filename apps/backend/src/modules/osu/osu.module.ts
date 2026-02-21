import { Module } from '@nestjs/common';
import { OsuModule as OsuInfrastructureModule } from 'lib/infrastructure/osu/osu.module';
import { OsuController } from './osu.controller';
import { OsuBeatmapService } from './osu.service';

@Module({
  imports: [OsuInfrastructureModule],
  controllers: [OsuController],
  providers: [OsuBeatmapService],
})
export class OsuFeatureModule {}
