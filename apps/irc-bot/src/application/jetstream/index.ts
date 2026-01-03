import {
  jetstream,
  jetstreamManager,
  type JetStreamClient,
  type JetStreamManager,
} from '@nats-io/jetstream';
import type { NatsConnection } from '@nats-io/nats-core';
import { connect, type NodeConnectionOptions } from '@nats-io/transport-node';
import { Config } from 'core/config';
import { logger } from 'infrastructure/logger';

let connectionPromise: Promise<NatsConnection> | null = null;

const buildConnectionOptions = (): NodeConnectionOptions => {
  const { host, port, user, password } = Config.nats;
  const servers = `nats://${host}:${port}`;

  const options: NodeConnectionOptions = {
    servers,
  };

  if (user) {
    options.user = user;
  }

  if (password) {
    options.pass = password;
  }

  return options;
};

const createConnection = async () => {
  const options = buildConnectionOptions();
  const nc = await connect(options);

  logger.info({ servers: options.servers }, 'Connected to NATS JetStream');

  nc.closed().then((err) => {
    if (err) {
      logger.error({ err }, 'NATS connection closed with error');
      return;
    }

    logger.info('NATS connection closed');
  });

  return nc;
};

export const getNatsConnection = async (): Promise<NatsConnection> => {
  connectionPromise ??= createConnection();

  return connectionPromise;
};

export const getJetStream = async (): Promise<JetStreamClient> => {
  const nc = await getNatsConnection();
  return jetstream(nc);
};

export const getJetStreamManager = async (): Promise<JetStreamManager> => {
  const nc = await getNatsConnection();
  return jetstreamManager(nc);
};
