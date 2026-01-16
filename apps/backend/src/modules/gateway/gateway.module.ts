import { Module } from '@nestjs/common';
import { OsuEventsController } from './osu.events.controller';
import { OsuLobbyGateway } from './osu-lobby.gateway';

@Module({
  providers: [OsuLobbyGateway],
  controllers: [OsuEventsController],
})
export class GatewayModule {}
