import type { OsuIrcClient } from 'core/irc';
import type { Message } from 'core/types/irc';

export type IrcEventMeta = {
  client: OsuIrcClient;
  message: Message;
};
