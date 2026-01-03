import { OsuEventArgs } from '../base';

export enum OsuIrcPrivMsgEvent {
  MATCH_LIMIT_EXCEEDED = 'You cannot create any more tournament matches. Please close any previous tournament matches you have open.',
}

export interface OsuMatchLimitExceededEvent extends OsuEventArgs {}

export type OsuIrcPrivMsgEventMap = {
  [OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED]: OsuMatchLimitExceededEvent;
};

export const rawCommandToOsuIrcPrivMsgEvent = (
  rawCommand: string,
): OsuIrcPrivMsgEvent | undefined => {
  return Object.values(OsuIrcPrivMsgEvent).find(
    (value) => (value as string) === rawCommand,
  );
};
