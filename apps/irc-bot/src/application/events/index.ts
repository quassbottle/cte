import { OsuIrcClient } from 'core/irc';

export function onRegistered(ctx: { client: OsuIrcClient }) {
  const { client } = ctx;

  client.roll();
  client.mpMakePrivate({ name: `${new Date().toISOString()}` });
}
