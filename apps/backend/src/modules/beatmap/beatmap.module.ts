import { Module } from '@nestjs/common';
import { OsuModule } from 'lib/infrastructure/osu/osu.module';
import { BeatmapService } from './beatmap.service';

@Module({
  imports: [OsuModule],
  providers: [BeatmapService],
  exports: [BeatmapService],
})
export class BeatmapModule {}
