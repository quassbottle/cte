import { Module } from '@nestjs/common';
import { OsuMultiplayerSyncModule } from 'modules/osu-multiplayer-sync/osu-multiplayer-sync.module';
import { QualificationLobbyController } from './qualification-lobby.controller';
import { QualificationLobbyRepository } from './qualification-lobby.repository';
import { QualificationLobbyService } from './qualification-lobby.service';
import {
  QualificationResultsRepository,
  QualificationResultsService,
} from './qualification-results.service';
import {
  QualificationSyncRepository,
  QualificationSyncScheduler,
} from './qualification-sync.scheduler';

@Module({
  imports: [OsuMultiplayerSyncModule],
  controllers: [QualificationLobbyController],
  providers: [
    QualificationLobbyRepository,
    QualificationLobbyService,
    QualificationResultsRepository,
    QualificationResultsService,
    QualificationSyncRepository,
    QualificationSyncScheduler,
  ],
  exports: [QualificationLobbyService, QualificationResultsService],
})
export class QualificationModule {}
