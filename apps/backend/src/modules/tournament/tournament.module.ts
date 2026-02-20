import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';

@Module({
  imports: [AuthModule],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
