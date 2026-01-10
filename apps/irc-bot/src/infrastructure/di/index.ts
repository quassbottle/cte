import 'reflect-metadata';

import { Config } from 'core/config';
import { OsuIrcClient } from 'core/irc';
import { Database, db } from 'infrastructure/db';
import { container, instanceCachingFactory } from 'tsyringe';

import { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/nats-core/lib/core';
import {
  getJetStream,
  getJetStreamManager,
  getNatsConnection,
} from 'application/jetstream';
import { MatchService } from 'application/services/match/match.service';
import { MessageService } from 'application/services/message/message.service';
import { OsuService } from 'application/services/osu/osu.service';
import { JetStreamPublisher } from 'core/jetstream';
import { DI_TOKENS } from './tokens';

let configured = false;

export const setupContainer = async () => {
  if (configured) return container;

  container.register<Database>(DI_TOKENS.database, {
    useValue: db,
  });

  container.register<OsuIrcClient>(DI_TOKENS.osuIrcClient, {
    useFactory: instanceCachingFactory<OsuIrcClient>(
      () => new OsuIrcClient(Config),
    ),
  });

  container.register<Config>(DI_TOKENS.config, {
    useValue: Config,
  });

  const [natsConnection, jetstreamClient, jetstreamManager] = await Promise.all(
    [getNatsConnection(), getJetStream(), getJetStreamManager()],
  );

  container.register<NatsConnection>(DI_TOKENS.natsConnection, {
    useValue: natsConnection,
  });

  container.register<JetStreamClient>(DI_TOKENS.jetstreamClient, {
    useValue: jetstreamClient,
  });

  container.register<JetStreamManager>(DI_TOKENS.jetstreamManager, {
    useValue: jetstreamManager,
  });

  container.registerSingleton(JetStreamPublisher);
  container.registerSingleton(OsuService);
  container.registerSingleton(MessageService);
  container.registerSingleton(MatchService);

  configured = true;
  return container;
};

export type AppContainer = typeof container;
export { container, DI_TOKENS };
