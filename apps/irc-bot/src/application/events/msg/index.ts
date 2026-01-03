import { OsuIrcPrivMsgEvent, OsuIrcPrivMsgEventBus } from 'core/bus/msg';
import { OsuIrcClient } from 'core/irc';
import { logger } from 'infrastructure/logger';

const createIrcPrivMsgBus = (client: OsuIrcClient): OsuIrcPrivMsgEventBus => {
  const bus = new OsuIrcPrivMsgEventBus(client);

  bus.use((context) => {
    logger.debug({ context }, 'PrivMsg bus middleware');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED, (data, meta) => {
    logger.warn({ data, meta }, 'Match limit reached');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED, (data) => {
    logger.info(
      { channel: data.channel, user: data.user, slot: data.slot },
      'Player joined slot',
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_SLOT_MOVED, (data) => {
    logger.info(
      { channel: data.channel, user: data.user, slot: data.slot },
      'Player moved slot',
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_PASSWORD_CHANGED, (data) => {
    logger.info(
      { channel: data.channel, user: data.user },
      'Match password changed',
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_HOST_CHANGED, (data) => {
    logger.info(
      { channel: data.channel, host: data.host, user: data.user },
      'Match host changed',
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_BEATMAP_CHANGED, (data) => {
    logger.info(
      { channel: data.channel, beatmap: data.beatmap, url: data.url },
      'Beatmap changed',
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_ALL_READY, (data) => {
    logger.info({ channel: data.channel }, 'All players ready');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_STARTED, (data) => {
    logger.info({ channel: data.channel }, 'Match started');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_ABORTED, (data) => {
    logger.info({ channel: data.channel }, 'Match aborted');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_HOST_CHANGING, (data) => {
    logger.info({ channel: data.channel }, 'Host is changing map');
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_PLAYER_FINISHED, (data) => {
    logger.info(
      {
        channel: data.channel,
        user: data.user,
        score: data.score,
        result: data.result,
      },
      'Player finished playing',
    );
  });

  return bus;
};

export { createIrcPrivMsgBus };
