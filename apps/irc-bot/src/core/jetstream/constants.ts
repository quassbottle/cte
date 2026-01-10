import { OsuPrivMsgEventArgs } from 'core/bus/irc';

export enum JetStreamSubject {
  MESSAGE_EVENT = 'events.osu_privmsg',
}

export type JetStreamSubjectPayloadMap = {
  [JetStreamSubject.MESSAGE_EVENT]: OsuPrivMsgEventArgs;
};
