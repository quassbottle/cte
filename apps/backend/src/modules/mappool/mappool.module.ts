import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { BeatmapModule } from 'modules/beatmap/beatmap.module';
import { TournamentModule } from 'modules/tournament/tournament.module';
import {
  MappoolController,
  TournamentMappoolController,
} from './mappool.controller';
import { MappoolService } from './mappool.service';

@Module({
  imports: [AuthModule, BeatmapModule, TournamentModule],
  controllers: [MappoolController, TournamentMappoolController],
  providers: [MappoolService],
  exports: [MappoolService],
})
export class MappoolModule {}
