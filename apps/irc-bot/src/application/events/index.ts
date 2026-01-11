import type { JetStreamManager } from '@nats-io/jetstream';
import { OsuIrcClient } from 'core/irc';
import { JetStreamStream } from 'core/jetstream/constants';
import { container, DI_TOKENS } from 'infrastructure/di';

export async function onRegistered(ctx: { client: OsuIrcClient }) {
  const { client } = ctx;

  client.roll();
  //client.mpMakePrivate({ name: `${new Date().toISOString()}` });

  const jsm = container.resolve<JetStreamManager>(DI_TOKENS.jetstreamManager);

  await jsm.streams.add({
    name: JetStreamStream.EVENTS,
    subjects: ['events:*', 'events.>'],
    storage: 'file',
  });
}
