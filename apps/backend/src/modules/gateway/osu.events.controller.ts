import {
  JetStreamSubject,
  OsuIrcPrivMsgBusEventPayload,
  OsuPrivMsgEventPayload,
} from '@cte/contracts';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OsuLobbyGateway } from './osu-lobby.gateway';

@Controller()
export class OsuEventsController {
  private readonly logger = new Logger(OsuEventsController.name);

  constructor(private readonly gateway: OsuLobbyGateway) {}

  @EventPattern(JetStreamSubject.MESSAGE_EVENT)
  handlePrivMsgEvent(@Payload() data: OsuPrivMsgEventPayload) {
    this.logger.log(data);
    this.gateway.handlePrivMsgEvent(data);
  }

  @EventPattern(JetStreamSubject.OSU_PRIVMSG_EVENT)
  handleLobbyEvent(@Payload() data: OsuIrcPrivMsgBusEventPayload) {
    this.logger.log(data);
    this.gateway.handleParsedPrivMsgEvent(data);
  }
}
