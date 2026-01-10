import { OsuIrcClient } from 'core/irc';
import { container, DI_TOKENS } from 'infrastructure/di';

export async function onRegistered(ctx: { client: OsuIrcClient }) {
  const { client } = ctx;

  client.roll();
  //client.mpMakePrivate({ name: `${new Date().toISOString()}` });

  const jsm = container.resolve(DI_TOKENS.jetstreamManager);

  await jsm.streams.add({
    name: 'EVENTS',
    subjects: ['events:*', 'events.>'],
    storage: 'file',
  });
}
