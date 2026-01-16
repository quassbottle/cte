import { OsuIrcClient } from 'core/irc';

export async function onRegistered(ctx: { client: OsuIrcClient }) {
  const { client } = ctx;

  client.roll();
  client.mpMakePrivate({ name: `${new Date().toISOString()}` });
}
