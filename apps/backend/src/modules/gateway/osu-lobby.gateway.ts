import {
  OsuIrcPrivMsgBusEventPayload,
  OsuPrivMsgEventPayload,
} from '@cte/contracts';
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';

type OsuLobbySocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  { channel?: string }
>;

type OsuLobbyServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  { channel?: string }
>;

@WebSocketGateway({ namespace: 'osu-lobby' })
export class OsuLobbyGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OsuLobbyGateway.name);
  private static readonly MATCH_EVENT = 'osu:match';
  private static readonly PRIVMSG_EVENT = 'osu:privmsg';

  @WebSocketServer()
  private readonly server: OsuLobbyServer;

  handlePrivMsgEvent(data: OsuPrivMsgEventPayload) {
    this.logger.log(data);

    this.server.to(data.channel).emit(OsuLobbyGateway.PRIVMSG_EVENT, data);
  }

  handleConnection(client: OsuLobbySocket, ...args: string[]) {
    const channel = this.extractChannel(
      client.handshake.query.channel ?? client.handshake.auth?.channel,
    );

    if (!channel) {
      this.logger.warn(`client ${client.id} missing channel, disconnecting`);
      client.disconnect(true);
      return;
    }

    client.join(channel);
    client.data.channel = channel;

    this.logger.log(
      `client ${client.id} connected to channel ${channel}: ${args.join(' ')}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`${client.id} disconnected`);
  }

  handleParsedPrivMsgEvent(data: OsuIrcPrivMsgBusEventPayload) {
    this.logger.log(data);

    this.server.to(data.channel).emit(OsuLobbyGateway.MATCH_EVENT, data);
  }

  private extractChannel(
    raw: string | string[] | undefined,
  ): string | undefined {
    if (typeof raw === 'string') {
      return raw;
    }

    if (Array.isArray(raw)) {
      const [first] = raw;
      return typeof first === 'string' ? first : undefined;
    }

    return undefined;
  }
}
