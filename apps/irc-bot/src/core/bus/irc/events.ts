import { OsuPrivMsgEventPayload } from '@cte/contracts';
import { MpChannel } from 'core/irc/types';
import { OsuEventArgs } from '../base';

export enum OsuIrcEvent {
  RPL_CREATIONTIME = '329',
  PRIVMSG = 'PRIVMSG',
}

export interface OsuRplCreationTimeArgs extends OsuEventArgs {
  channel: MpChannel;
  creationTime: Date;
}

export type OsuPrivMsgEventArgs = OsuPrivMsgEventPayload;

export type OsuEventArgsMap = {
  [OsuIrcEvent.RPL_CREATIONTIME]: OsuRplCreationTimeArgs;
  [OsuIrcEvent.PRIVMSG]: OsuPrivMsgEventArgs;
};

export const rawCommandToOsuIrcEvent = (
  rawCommand: string,
): OsuIrcEvent | undefined => {
  return Object.values(OsuIrcEvent).find(
    (value) => (value as string) === rawCommand,
  );
};
