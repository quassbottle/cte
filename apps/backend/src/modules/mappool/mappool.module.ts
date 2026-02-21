import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { BeatmapModule } from 'modules/beatmap/beatmap.module';
import { MappoolController } from './mappool.controller';
import { MappoolService } from './mappool.service';

@Module({
  imports: [AuthModule, BeatmapModule],
  controllers: [MappoolController],
  providers: [MappoolService],
  exports: [MappoolService],
})
export class MappoolModule {}
