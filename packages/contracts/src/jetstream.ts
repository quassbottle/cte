export enum JetStreamStream {
  EVENTS = 'EVENTS',
  COMMANDS = 'COMMANDS',
}

export enum JetStreamSubject {
  MESSAGE_EVENT = 'events.osu_privmsg',
  OSU_CHAT_EVENT = 'events.osu.chat',
  OSU_CREATE_PRIVATE_MATCH = 'cmd.osu.create-private-match',
  OSU_CLOSE_MATCH = 'cmd.osu.close-match',
}

export enum JetStreamConsumerDurable {
  OSU_CREATE_PRIVATE_MATCH = 'osu_create_private_match',
  OSU_CLOSE_MATCH = 'osu_close_match',
}

export interface OsuPrivMsgEventPayload {
  user: string;
  channel: string;
  message: string;
}

export interface CreatePrivateMatchCommandPayload {
  /**
   * Human-friendly match title.
   */
  name: string;
}

export interface CloseMatchCommandPayload {
  /**
   * osu! multiplayer match identifier (numeric part of #mp_ channel).
   */
  osuMatchId: number;
}

export interface OsuIrcPrivMsgBusEventPayload {
  event: string;
  payload: unknown;
  channel: string;
}

export type JetStreamSubjectPayloadMap = {
  [JetStreamSubject.MESSAGE_EVENT]: OsuPrivMsgEventPayload;
  [JetStreamSubject.OSU_CHAT_EVENT]: OsuIrcPrivMsgBusEventPayload;
  [JetStreamSubject.OSU_CREATE_PRIVATE_MATCH]: CreatePrivateMatchCommandPayload;
  [JetStreamSubject.OSU_CLOSE_MATCH]: CloseMatchCommandPayload;
};
