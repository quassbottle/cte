import {
  JetStreamConsumerDurable,
  JetStreamStream,
  JetStreamSubject,
  type JetStreamSubjectPayloadMap,
} from '@cte/contracts';
import {
  AckPolicy,
  type JetStreamClient,
  type JetStreamManager,
  type JsMsg,
} from '@nats-io/jetstream';
import { MatchService } from 'application/services/match/match.service';
import { OsuIrcClient } from 'core/irc';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { logger } from 'infrastructure/logger';
import { inject, injectable } from 'tsyringe';

@injectable()
export class JetStreamCommandsSubscriber {
  constructor(
    @inject(DI_TOKENS.jetstreamManager)
    private readonly jetStreamManager: JetStreamManager,
    @inject(DI_TOKENS.jetstreamClient)
    private readonly jetStreamClient: JetStreamClient,
    @inject(DI_TOKENS.osuIrcClient)
    private readonly osuIrcClient: OsuIrcClient,
    @inject(MatchService)
    private readonly matchService: MatchService,
  ) {}

  public async start(): Promise<void> {
    await this.ensureInfrastructure();

    void this.consumeCreatePrivateMatch().catch((err) => {
      logger.error(
        { err },
        'Create private match consumer stopped unexpectedly',
      );
    });
    void this.consumeCloseMatch().catch((err) => {
      logger.error({ err }, 'Close match consumer stopped unexpectedly');
    });
  }

  private async ensureInfrastructure(): Promise<void> {
    await this.ensureCommandStream();
    await Promise.all([
      this.ensureConsumer(
        JetStreamConsumerDurable.OSU_CREATE_PRIVATE_MATCH,
        JetStreamSubject.OSU_CREATE_PRIVATE_MATCH,
      ),
      this.ensureConsumer(
        JetStreamConsumerDurable.OSU_CLOSE_MATCH,
        JetStreamSubject.OSU_CLOSE_MATCH,
      ),
    ]);
  }

  private async ensureCommandStream(): Promise<void> {
    const desired = {
      name: JetStreamStream.COMMANDS,
      subjects: [
        JetStreamSubject.OSU_CREATE_PRIVATE_MATCH,
        JetStreamSubject.OSU_CLOSE_MATCH,
      ],
      storage: 'file' as const,
    };

    const existing = await this.jetStreamManager.streams
      .info(desired.name)
      .catch(() => null);

    if (!existing) {
      await this.jetStreamManager.streams.add(desired);
      logger.info(
        { stream: JetStreamStream.COMMANDS },
        'JetStream command stream created',
      );
      return;
    }

    const subjectsChanged =
      JSON.stringify(existing.config.subjects ?? []) !==
      JSON.stringify(desired.subjects);
    const storageChanged =
      (existing.config.storage || '').toLowerCase() !==
      (desired.storage || '').toLowerCase();

    if (subjectsChanged || storageChanged) {
      await this.jetStreamManager.streams.update(desired.name, {
        ...existing.config,
        ...desired,
      });
      logger.info(
        { stream: JetStreamStream.COMMANDS },
        'JetStream command stream updated to desired config',
      );
    }
  }

  private async ensureConsumer(
    durableName: JetStreamConsumerDurable,
    filterSubject: JetStreamSubject,
  ): Promise<void> {
    try {
      await this.jetStreamManager.consumers.add(JetStreamStream.COMMANDS, {
        durable_name: durableName,
        filter_subject: filterSubject,
        ack_policy: AckPolicy.Explicit,
      });
      logger.info(
        { consumer: durableName, subject: filterSubject },
        'JetStream consumer ensured',
      );
    } catch (err: unknown) {
      const alreadyExists =
        err instanceof Error &&
        (err.message.toLowerCase().includes('exists') ||
          err.message.toLowerCase().includes('already'));

      if (!alreadyExists) {
        throw err;
      }
    }
  }

  private async consumeCreatePrivateMatch(): Promise<void> {
    const consumer = await this.jetStreamClient.consumers.get(
      JetStreamStream.COMMANDS,
      JetStreamConsumerDurable.OSU_CREATE_PRIVATE_MATCH,
    );

    const messages = await consumer.consume();

    for await (const msg of messages) {
      await this.processMessage(
        JetStreamSubject.OSU_CREATE_PRIVATE_MATCH,
        msg,
        async (payload) => {
          logger.info(
            { name: payload.name },
            'Creating private osu! match from command',
          );

          this.osuIrcClient.mpMakePrivate({ name: payload.name });
        },
      );
    }
  }

  private async consumeCloseMatch(): Promise<void> {
    const consumer = await this.jetStreamClient.consumers.get(
      JetStreamStream.COMMANDS,
      JetStreamConsumerDurable.OSU_CLOSE_MATCH,
    );

    const messages = await consumer.consume();

    for await (const msg of messages) {
      await this.processMessage(
        JetStreamSubject.OSU_CLOSE_MATCH,
        msg,
        async (payload) => {
          logger.info(
            { osuMatchId: payload.osuMatchId },
            'Closing osu! match from command',
          );

          await this.matchService.close({
            osuMatchId: payload.osuMatchId,
          });
        },
      );
    }
  }

  private async processMessage<TSubject extends JetStreamSubject>(
    subject: TSubject,
    msg: JsMsg,
    handler: (payload: JetStreamSubjectPayloadMap[TSubject]) => Promise<void>,
  ): Promise<void> {
    let payload: JetStreamSubjectPayloadMap[TSubject];

    try {
      payload = msg.json<JetStreamSubjectPayloadMap[TSubject]>();
    } catch (err: unknown) {
      logger.error(
        {
          err,
          subject,
          rawPayload: Buffer.from(msg.data).toString('utf8'),
        },
        'Failed to parse JetStream message payload',
      );

      try {
        msg.term();
      } catch (ackErr) {
        logger.error({ err: ackErr }, 'Failed to terminate JetStream message');
      }
      return;
    }

    try {
      await handler(payload);
      msg.ack();
    } catch (err: unknown) {
      logger.error(
        { err, subject, payload },
        'Failed to handle JetStream command message',
      );

      try {
        msg.nak();
      } catch (ackErr) {
        logger.error({ err: ackErr }, 'Failed to requeue JetStream message');
      }
    }
  }
}
