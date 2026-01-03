import { BaseEventBus } from 'core/bus/base';
import { IrcEventMeta } from 'core/bus/types';
import { OsuIrcClient } from 'core/irc';
import type { Message } from 'core/types/irc';
import {
  OsuIrcPrivMsgEvent,
  OsuIrcPrivMsgEventMap,
  rawCommandToOsuIrcPrivMsgEvent,
} from './events';

export class OsuIrcPrivMsgEventBus extends BaseEventBus<
  OsuIrcPrivMsgEvent,
  OsuIrcPrivMsgEventMap,
  IrcEventMeta
> {
  constructor(private readonly client: OsuIrcClient) {
    super();
  }

  protected toEvent(rawCommand: string): OsuIrcPrivMsgEvent | undefined {
    return rawCommandToOsuIrcPrivMsgEvent(rawCommand);
  }

  protected parseArgs<T extends OsuIrcPrivMsgEvent>(
    event: T,
    ...args: string[]
  ): OsuIrcPrivMsgEventMap[T] {
    switch (event) {
      case OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED:
        return {
          user: String(args[0]),
        } as OsuIrcPrivMsgEventMap[T];
      default:
        throw new Error(`Unknown event: ${event}`);
    }
  }

  public emitWithMessage(meta: Message): void {
    super.emit(meta.rawCommand, meta.args, {
      client: this.client,
      message: meta,
    });
  }
}
