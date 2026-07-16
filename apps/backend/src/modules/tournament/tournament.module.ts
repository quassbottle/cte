import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { MatchModule } from 'modules/match/match.module';
import { QualificationModule } from 'modules/qualification/qualification.module';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';

@Module({
  imports: [AuthModule, MatchModule, QualificationModule],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
