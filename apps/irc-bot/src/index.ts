import 'reflect-metadata';

import { onRegistered } from 'application/events';
import { OsuIrcClient } from 'core/irc';
import { container, DI_TOKENS, setupContainer } from 'infrastructure/di';
import { logger } from 'infrastructure/logger';
import { createIrcRawBus } from './application/events/irc';
import { createIrcPrivMsgBus } from './application/events/msg';

setupContainer();

const client = container.resolve<OsuIrcClient>(DI_TOKENS.osuIrcClient);
const ircRawBus = createIrcRawBus(client);
const ircPrivMsgBus = createIrcPrivMsgBus(client);

client.on('registered', () => {
  logger.info('Connected to IRC server');
  onRegistered({ client });
});

client.on('error', (message) => {
  logger.error({ err: message }, 'IRC Error');
});

client.on('raw', (message) => {
  if (message.command === 'QUIT') return;
  logger.debug({ message }, 'IRC raw');

  if (message.command === 'PRIVMSG') {
    ircPrivMsgBus.emitWithMessage(message);
  }
  ircRawBus.emitWithMessage(message);
});

client.connect();
