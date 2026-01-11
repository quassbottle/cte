import 'reflect-metadata';

import { InjectionToken } from 'tsyringe';

import { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/nats-core/lib/core';
import { Config } from 'core/config';
import { OsuIrcClient } from 'core/irc';
import { Database } from 'infrastructure/db';

export const DI_TOKENS: {
  osuIrcClient: InjectionToken<OsuIrcClient>;
  database: InjectionToken<Database>;
  config: InjectionToken<Config>;
  natsConnection: InjectionToken<NatsConnection>;
  jetstreamClient: InjectionToken<JetStreamClient>;
  jetstreamManager: InjectionToken<JetStreamManager>;
} = {
  osuIrcClient: Symbol('OsuIrcClient'),
  database: Symbol('Database'),
  config: Symbol('Config'),
  natsConnection: Symbol('NatsConnection'),
  jetstreamClient: Symbol('JetStreamClient'),
  jetstreamManager: Symbol('JetStreamManager'),
};
