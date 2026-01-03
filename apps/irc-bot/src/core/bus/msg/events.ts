import { OsuEventArgs } from '../base';

export enum OsuIrcPrivMsgEvent {
  MATCH_LIMIT_EXCEEDED = 'MATCH_LIMIT_EXCEEDED',
  MATCH_SLOT_JOINED = 'MATCH_SLOT_JOINED',
  MATCH_PASSWORD_CHANGED = 'MATCH_PASSWORD_CHANGED',
  MATCH_SLOT_MOVED = 'MATCH_SLOT_MOVED',
  MATCH_HOST_CHANGED = 'MATCH_HOST_CHANGED',
  MATCH_BEATMAP_CHANGED = 'MATCH_BEATMAP_CHANGED',
  MATCH_ALL_READY = 'MATCH_ALL_READY',
  MATCH_STARTED = 'MATCH_STARTED',
  MATCH_ABORTED = 'MATCH_ABORTED',
  MATCH_HOST_CHANGING = 'MATCH_HOST_CHANGING',
}

export interface OsuMatchLimitExceededEvent extends OsuEventArgs {
  channel: string;
}

export interface OsuMatchSlotJoinedEvent extends OsuEventArgs {
  channel: string;
  slot: number;
}

export interface OsuMatchPasswordChangedEvent extends OsuEventArgs {
  channel: string;
}

export interface OsuMatchSlotMovedEvent extends OsuEventArgs {
  channel: string;
  slot: number;
}

export interface OsuMatchHostChangedEvent extends OsuEventArgs {
  channel: string;
  host: string;
}

export interface OsuMatchBeatmapChangedEvent extends OsuEventArgs {
  channel: string;
  beatmap: string;
  url?: string;
}

export interface OsuMatchAllReadyEvent extends OsuEventArgs {
  channel: string;
}

export interface OsuMatchStartedEvent extends OsuEventArgs {
  channel: string;
}

export interface OsuMatchAbortedEvent extends OsuEventArgs {
  channel: string;
}

export interface OsuMatchHostChangingEvent extends OsuEventArgs {
  channel: string;
}

export type OsuIrcPrivMsgEventMap = {
  [OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED]: OsuMatchLimitExceededEvent;
  [OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED]: OsuMatchSlotJoinedEvent;
  [OsuIrcPrivMsgEvent.MATCH_PASSWORD_CHANGED]: OsuMatchPasswordChangedEvent;
  [OsuIrcPrivMsgEvent.MATCH_SLOT_MOVED]: OsuMatchSlotMovedEvent;
  [OsuIrcPrivMsgEvent.MATCH_HOST_CHANGED]: OsuMatchHostChangedEvent;
  [OsuIrcPrivMsgEvent.MATCH_BEATMAP_CHANGED]: OsuMatchBeatmapChangedEvent;
  [OsuIrcPrivMsgEvent.MATCH_ALL_READY]: OsuMatchAllReadyEvent;
  [OsuIrcPrivMsgEvent.MATCH_STARTED]: OsuMatchStartedEvent;
  [OsuIrcPrivMsgEvent.MATCH_ABORTED]: OsuMatchAbortedEvent;
  [OsuIrcPrivMsgEvent.MATCH_HOST_CHANGING]: OsuMatchHostChangingEvent;
};

export const MATCH_SLOT_JOINED_REGEX =
  /^(?<username>.+) joined in slot (?<slot>\d+)\.$/;
export const MATCH_SLOT_MOVED_REGEX =
  /^(?<username>.+) moved to slot (?<slot>\d+)\.?$/;
export const MATCH_PASSWORD_CHANGED_MESSAGE = 'Changed the match password';
export const MATCH_LIMIT_MESSAGE =
  'You cannot create any more tournament matches. Please close any previous tournament matches you have open.';
export const MATCH_HOST_CHANGED_REGEX =
  /^Changed match host to (?<host>.+)$/;
export const MATCH_BEATMAP_CHANGED_REGEX =
  /^Beatmap changed to: (?<beatmap>.+?) \((?<url>https?:\/\/[^\s)]+)\)$/;
export const MATCH_ALL_READY_MESSAGE = 'All players are ready';
export const MATCH_STARTED_MESSAGE = 'The match has started!';
export const MATCH_ABORTED_MESSAGE = 'Aborted the match';
export const MATCH_HOST_CHANGING_MESSAGE = 'Host is changing map...';

export const rawCommandToOsuIrcPrivMsgEvent = (
  message: string,
): OsuIrcPrivMsgEvent | undefined => {
  if (message === MATCH_LIMIT_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED;
  }

  if (message === MATCH_PASSWORD_CHANGED_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_PASSWORD_CHANGED;
  }

  if (MATCH_SLOT_JOINED_REGEX.test(message)) {
    return OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED;
  }

  if (MATCH_SLOT_MOVED_REGEX.test(message)) {
    return OsuIrcPrivMsgEvent.MATCH_SLOT_MOVED;
  }

  if (MATCH_HOST_CHANGED_REGEX.test(message)) {
    return OsuIrcPrivMsgEvent.MATCH_HOST_CHANGED;
  }

  if (MATCH_BEATMAP_CHANGED_REGEX.test(message)) {
    return OsuIrcPrivMsgEvent.MATCH_BEATMAP_CHANGED;
  }

  if (message === MATCH_ALL_READY_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_ALL_READY;
  }

  if (message === MATCH_STARTED_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_STARTED;
  }

  if (message === MATCH_ABORTED_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_ABORTED;
  }

  if (message === MATCH_HOST_CHANGING_MESSAGE) {
    return OsuIrcPrivMsgEvent.MATCH_HOST_CHANGING;
  }

  return undefined;
};
