import 'reflect-metadata';

import { InjectionToken } from 'tsyringe';

import { Config } from 'core/config';
import { OsuIrcClient } from 'core/irc';
import { Database } from 'infrastructure/db';

export const DI_TOKENS: {
  osuIrcClient: InjectionToken<OsuIrcClient>;
  database: InjectionToken<Database>;
  config: InjectionToken<Config>;
} = {
  osuIrcClient: Symbol('OsuIrcClient'),
  database: Symbol('Database'),
  config: Symbol('Config'),
};
