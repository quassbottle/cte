import { OsuPrivMsgEventPayload } from '@cte/contracts';
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'osu-lobby' })
export class OsuLobbyGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OsuLobbyGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  handlePrivMsgEvent(data: OsuPrivMsgEventPayload) {
    this.logger.log(data);
    // Extend here to emit to connected websocket clients if needed
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`client ${client.id} connected: ${args.join(' ')}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`${client.id} disconnected`);
  }
}
