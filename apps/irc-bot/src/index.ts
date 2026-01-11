import 'reflect-metadata';

import { onRegistered } from 'application/events';
import { JetStreamCommandsSubscriber } from 'application/jetstream/commands.subscriber';
import { OsuIrcClient } from 'core/irc';
import { container, DI_TOKENS, setupContainer } from 'infrastructure/di';
import { logger } from 'infrastructure/logger';
import { createIrcRawBus } from './application/events/irc';
import { createIrcPrivMsgBus } from './application/events/msg';

const bootstrap = async () => {
  await setupContainer();

  const client = container.resolve<OsuIrcClient>(DI_TOKENS.osuIrcClient);
  const ircRawBus = createIrcRawBus(client);
  const ircPrivMsgBus = createIrcPrivMsgBus(client);
  const commandsSubscriber = container.resolve(JetStreamCommandsSubscriber);
  let commandsStarted = false;

  const startCommandsSubscriber = async () => {
    if (commandsStarted) return;
    commandsStarted = true;
    await commandsSubscriber.start();
  };

  client.on('registered', () => {
    logger.info('Connected to IRC server');
    void startCommandsSubscriber().catch((err) => {
      logger.error({ err }, 'Failed to start JetStream command subscriber');
      process.exitCode = 1;
    });
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
};

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap IRC bot');
  process.exitCode = 1;
});
