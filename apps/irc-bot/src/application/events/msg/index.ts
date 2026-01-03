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

  bus.on(OsuIrcPrivMsgEvent.MATCH_SLOT_JOINED, (data) => {
    console.log(
      `Event Bus - Player joined: ${data.user} -> ${data.channel} (slot ${data.slot})`,
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_SLOT_MOVED, (data) => {
    console.log(
      `Event Bus - Player moved: ${data.user} -> ${data.channel} (slot ${data.slot})`,
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_PASSWORD_CHANGED, (data) => {
    console.log(
      `Event Bus - Match password changed in ${data.channel} by ${data.user}`,
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_HOST_CHANGED, (data) => {
    console.log(
      `Event Bus - Host changed in ${data.channel}: ${data.host} (by ${data.user})`,
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_BEATMAP_CHANGED, (data) => {
    console.log(
      `Event Bus - Beatmap changed in ${data.channel}: ${data.beatmap} (${data.url ?? 'no url'})`,
    );
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_ALL_READY, (data) => {
    console.log(`Event Bus - All players ready in ${data.channel}`);
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_STARTED, (data) => {
    console.log(`Event Bus - Match started in ${data.channel}`);
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_ABORTED, (data) => {
    console.log(`Event Bus - Match aborted in ${data.channel}`);
  });

  bus.on(OsuIrcPrivMsgEvent.MATCH_HOST_CHANGING, (data) => {
    console.log(`Event Bus - Host is changing map in ${data.channel}`);
  });

  return bus;
};

export { createIrcPrivMsgBus };
