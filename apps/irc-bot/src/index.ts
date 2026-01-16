import 'reflect-metadata';

import { JetStreamStream } from '@cte/contracts';
import { JetStreamManager } from '@nats-io/jetstream';
import { onRegistered } from 'application/events';
import { JetStreamCommandsSubscriber } from 'application/jetstream/commands.subscriber';
import { OsuIrcClient } from 'core/irc';
import { container, DI_TOKENS, setupContainer } from 'infrastructure/di';
import { ModuleLifecycle } from 'infrastructure/lifecycle';
import { logger } from 'infrastructure/logger';
import { createIrcRawBus } from './application/events/irc';
import { createIrcPrivMsgBus } from './application/events/msg';

const lifecycle = new ModuleLifecycle(container);

const bootstrap = async () => {
  await setupContainer();
  await lifecycle.init();
  lifecycle.registerShutdownHooks();

  const client = container.resolve<OsuIrcClient>(DI_TOKENS.osuIrcClient);
  const ircRawBus = createIrcRawBus(client);
  const ircPrivMsgBus = createIrcPrivMsgBus(client);
  const commandsSubscriber = container.resolve(JetStreamCommandsSubscriber);
  let commandsStarted = false;

  const jsm = container.resolve<JetStreamManager>(DI_TOKENS.jetstreamManager);

  await jsm.streams.add({
    name: JetStreamStream.EVENTS,
    subjects: ['events:*', 'events.>'],
    storage: 'file',
  });

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
  void lifecycle.destroy().catch((destroyErr) => {
    logger.error({ err: destroyErr }, 'Failed to shutdown modules gracefully');
  });
  process.exitCode = 1;
});
