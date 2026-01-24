import {
  JetStreamSubject,
  OsuIrcPrivMsgBusEventPayload,
  OsuPrivMsgEventPayload,
} from '@cte/contracts';
import { NatsContext } from '@initbit/nestjs-jetstream';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { OsuLobbyGateway } from './osu-lobby.gateway';

@Controller()
export class OsuEventsController {
  private readonly logger = new Logger(OsuEventsController.name);

  constructor(private readonly gateway: OsuLobbyGateway) {}

  @EventPattern(JetStreamSubject.MESSAGE_EVENT)
  handlePrivMsgEvent(
    @Payload() data: OsuPrivMsgEventPayload,
    @Ctx() context: NatsContext,
  ) {
    try {
      const message = context.getMessage();
      this.logger.log({
        subject: context.getSubject(),
        isJetStream: context.isJetStream(),
        messageType: message?.constructor?.name,
        data,
      });
      this.gateway.handlePrivMsgEvent(data);
      if (context.isJetStream()) {
        // Ensure JetStream messages are acknowledged once the handler succeeds
        context.ack();
      }
    } catch (err) {
      this.logger.error({ err, data }, 'Failed to handle PRIVMSG event');
      throw err;
    }
  }

  @EventPattern(JetStreamSubject.OSU_CHAT_EVENT)
  handleLobbyEvent(
    @Payload() data: OsuIrcPrivMsgBusEventPayload,
    @Ctx() context: NatsContext,
  ) {
    try {
      const message = context.getMessage();
      this.logger.log({
        subject: context.getSubject(),
        isJetStream: context.isJetStream(),
        messageType: message?.constructor?.name,
        data,
      });
      this.gateway.handleParsedPrivMsgEvent(data);
      if (context.isJetStream()) {
        // Ensure JetStream messages are acknowledged once the handler succeeds
        context.ack();
      }
    } catch (err) {
      this.logger.error({ err, data }, 'Failed to handle IRC chat event');
      throw err;
    }
  }
}
