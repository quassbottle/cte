import { Module } from '@nestjs/common';
import { PoliciesModule } from 'modules/auth/policies/policies.module';
import { OsuMultiplayerSyncModule } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.module';
import { QualificationLobbyController } from './qualification-lobby.controller';
import { QualificationLobbyRepository } from './qualification-lobby.repository';
import { QualificationLobbyService } from './qualification-lobby.service';
import { QualificationResultsRepository } from './qualification-results.repository';
import { QualificationResultsService } from './qualification-results.service';
import { QualificationSyncRepository } from './qualification-sync.repository';
import { QualificationSyncScheduler } from './qualification-sync.scheduler';

@Module({
  imports: [OsuMultiplayerSyncModule, PoliciesModule],
  controllers: [QualificationLobbyController],
  providers: [
    QualificationLobbyRepository,
    QualificationLobbyService,
    QualificationResultsRepository,
    QualificationResultsService,
    QualificationSyncRepository,
    QualificationSyncScheduler,
  ],
  exports: [
    QualificationLobbyRepository,
    QualificationLobbyService,
    QualificationResultsService,
  ],
})
export class QualificationModule {}
