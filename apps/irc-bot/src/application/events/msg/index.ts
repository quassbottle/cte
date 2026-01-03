import { OsuIrcPrivMsgEvent, OsuIrcPrivMsgEventBus } from 'core/bus/msg';
import { OsuIrcClient } from 'core/irc';

const createIrcPrivMsgBus = (client: OsuIrcClient): OsuIrcPrivMsgEventBus => {
  const bus = new OsuIrcPrivMsgEventBus(client);

  bus.use((context) => {
    console.log('Event Bus - Middleware:', context);
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_LIMIT_EXCEEDED, (data, meta) => {
    console.log('Event Bus - Match limit reached:', data);
    console.log('Meta:', meta);
  });

  return bus;
};

export { createIrcPrivMsgBus };
