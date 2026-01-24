import { Module } from '@nestjs/common';
import { OsuLobbyGateway } from './osu-lobby.gateway';
import { OsuEventsController } from './osu.events.controller';

@Module({
  providers: [OsuLobbyGateway],
  controllers: [OsuEventsController],
})
export class GatewayModule {}
