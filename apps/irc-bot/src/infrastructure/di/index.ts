import 'reflect-metadata';

import { Config } from 'core/config';
import { OsuIrcClient } from 'core/irc';
import { Database, db } from 'infrastructure/db';
import { container, instanceCachingFactory } from 'tsyringe';

import { MatchService } from 'application/services/match/match.service';
import { MessageService } from 'application/services/message/message.service';
import { OsuService } from 'application/services/osu/osu.service';
import { DI_TOKENS } from './tokens';

let configured = false;

export const setupContainer = () => {
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

  container.registerSingleton(OsuService);
  container.registerSingleton(MessageService);
  container.registerSingleton(MatchService);

  configured = true;
  return container;
};

export type AppContainer = typeof container;
export { container, DI_TOKENS };
