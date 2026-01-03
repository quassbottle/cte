import 'reflect-metadata';

import { onRegistered } from 'application/events';
import { OsuIrcClient } from 'core/irc';
import { container, DI_TOKENS, setupContainer } from 'infrastructure/di';
import { createIrcRawBus } from './application/events/irc';
import { createIrcPrivMsgBus } from './application/events/msg';

setupContainer();

const client = container.resolve<OsuIrcClient>(DI_TOKENS.osuIrcClient);
const ircRawBus = createIrcRawBus(client);
const ircPrivMsgBus = createIrcPrivMsgBus(client);

client.on('registered', () => {
  console.log('Connected to IRC server');
  onRegistered({ client });
});

client.on('error', (message) => {
  console.error('IRC Error:', message);
});

client.on('message', (from, to, message) => {
  console.log(`[${to}] <${from}>: ${message}`);
});

client.on('raw', (message) => {
  if (message.command === 'QUIT') return;
  console.log('[RAW]', message);

  if (message.command === 'PRIVMSG') {
    ircPrivMsgBus.emitWithMessage(message);
  } else {
    ircRawBus.emitWithMessage(message);
  }
});

client.connect();
