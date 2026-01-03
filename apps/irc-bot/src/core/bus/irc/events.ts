import { MpChannel } from 'core/irc/types';
import { OsuEventArgs } from '../base';

export enum OsuIrcEvent {
  RPL_CREATIONTIME = '329',
}

export interface OsuRplCreationTimeArgs extends OsuEventArgs {
  channel: MpChannel;
  creationTime: Date;
}

export type OsuEventArgsMap = {
  [OsuIrcEvent.RPL_CREATIONTIME]: OsuRplCreationTimeArgs;
};

export const rawCommandToOsuIrcEvent = (
  rawCommand: string,
): OsuIrcEvent | undefined => {
  return Object.values(OsuIrcEvent).find(
    (value) => (value as string) === rawCommand,
  );
};
