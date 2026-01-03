import type { Message } from 'core/types/irc';

import { BaseEventBus } from 'core/bus/base';
import {
  OsuEventArgsMap,
  OsuIrcEvent,
  rawCommandToOsuIrcEvent,
} from 'core/bus/irc/events';
import { IrcEventMeta } from 'core/bus/types';
import { OsuIrcClient } from 'core/irc';
import { timestampToDate } from 'core/utils/date';

export class OsuIrcEventBus extends BaseEventBus<
  OsuIrcEvent,
  OsuEventArgsMap,
  IrcEventMeta
> {
  constructor(private readonly client: OsuIrcClient) {
    super();
  }

  protected toEvent(rawCommand: string): OsuIrcEvent | undefined {
    return rawCommandToOsuIrcEvent(rawCommand);
  }

  protected parseArgs<T extends OsuIrcEvent>(
    event: T,
    meta: IrcEventMeta,
    ...args: string[]
  ): OsuEventArgsMap[T] {
    switch (event) {
      case OsuIrcEvent.RPL_CREATIONTIME:
        return {
          user: String(args[0]),
          channel: String(args[1]),
          creationTime: timestampToDate(args[2]),
        } as OsuEventArgsMap[T];
      case OsuIrcEvent.PRIVMSG:
        return {
          user: String(meta.message.nick ?? meta.message.user ?? ''),
          channel: String(args[0]),
          message: String(args[1]),
        } as OsuEventArgsMap[T];
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
