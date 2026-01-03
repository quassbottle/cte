import { BaseEventBus } from 'core/bus/base';
import { IrcEventMeta } from 'core/bus/types';
import { OsuIrcClient } from 'core/irc';
import type { Message } from 'core/types/irc';
import {
  OsuIrcPrivMsgEvent,
  OsuIrcPrivMsgEventMap,
  MATCH_SLOT_JOINED_REGEX,
  MATCH_SLOT_MOVED_REGEX,
  MATCH_HOST_CHANGED_REGEX,
  MATCH_BEATMAP_CHANGED_REGEX,
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
    meta: IrcEventMeta,
    ...args: string[]
  ): OsuIrcPrivMsgEventMap[T] {
    const [channel, message] = args;
    const defaultUser = String(meta.message.nick ?? meta.message.user ?? args[0]);

    switch (event) {
      case OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED:
        return {
          user: defaultUser,
          channel: String(channel),
        } as OsuIrcPrivMsgEventMap[T];
      case OsuIrcPrivMsgEvent.MATCH_PASSWORD_CHANGED:
        return {
          user: defaultUser,
          channel: String(channel),
        } as OsuIrcPrivMsgEventMap[T];
      case OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED:
      case OsuIrcPrivMsgEvent.MATCH_SLOT_MOVED: {
        const matchRegex =
          event === OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED
            ? MATCH_SLOT_JOINED_REGEX
            : MATCH_SLOT_MOVED_REGEX;
        const match = matchRegex.exec(message ?? '');
        if (!match) {
          throw new Error(`Failed to parse match slot message: ${message}`);
        }

        const slot = Number(match.groups?.slot);
        if (Number.isNaN(slot)) {
          throw new Error(`Invalid slot number: ${match.groups?.slot}`);
        }

        return {
          user: String(match?.groups?.username ?? defaultUser),
          channel: String(channel),
          slot,
        } as OsuIrcPrivMsgEventMap[T];
      }
      case OsuIrcPrivMsgEvent.MATCH_HOST_CHANGED: {
        const match = MATCH_HOST_CHANGED_REGEX.exec(message ?? '');
        if (!match?.groups?.host) {
          throw new Error(`Failed to parse host change message: ${message}`);
        }

        return {
          user: defaultUser,
          channel: String(channel),
          host: match.groups.host.trim(),
        } as OsuIrcPrivMsgEventMap[T];
      }
      case OsuIrcPrivMsgEvent.MATCH_BEATMAP_CHANGED: {
        const match = MATCH_BEATMAP_CHANGED_REGEX.exec(message ?? '');
        if (!match?.groups?.beatmap) {
          throw new Error(`Failed to parse beatmap change message: ${message}`);
        }

        return {
          user: defaultUser,
          channel: String(channel),
          beatmap: match.groups.beatmap.trim(),
          url: match.groups.url,
        } as OsuIrcPrivMsgEventMap[T];
      }
      case OsuIrcPrivMsgEvent.MATCH_ALL_READY:
      case OsuIrcPrivMsgEvent.MATCH_STARTED:
      case OsuIrcPrivMsgEvent.MATCH_ABORTED:
      case OsuIrcPrivMsgEvent.MATCH_HOST_CHANGING:
        return {
          user: defaultUser,
          channel: String(channel),
        } as OsuIrcPrivMsgEventMap[T];
      default:
        throw new Error(`Unknown event: ${event}`);
    }
  }

  public emitWithMessage(meta: Message): void {
    const message = meta.args?.[1];

    super.emit(message, meta.args ?? [], {
      client: this.client,
      message: meta,
    });
  }
}
