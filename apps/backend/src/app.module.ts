import { JetStreamStream, JetStreamSubject } from '@cte/contracts';
import { NatsJetStreamModule } from '@initbit/nestjs-jetstream';
import { DrizzlePGModule } from '@knaadh/nestjs-drizzle-pg';
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { EnvService } from 'lib/common/env/env.service';
import { AuthModule } from 'modules/auth/auth.module';
import { GatewayModule } from 'modules/gateway/gateway.module';
import { UserModule } from 'modules/user/user.module';
import { AckPolicy, DeliverPolicy } from 'nats';
import { ZodValidationPipe } from 'nestjs-zod';
import { EnvModule } from './lib/common/env/env.module';
import * as schema from './lib/infrastructure/db/schema';

@Module({
  imports: [
    EnvModule,
    AuthModule,
    UserModule,
    GatewayModule,
    DrizzlePGModule.registerAsync({
      tag: 'DB',
      inject: [EnvService],
      useFactory(config: EnvService) {
        return {
          pg: {
            connection: 'pool',
            config: {
              connectionString: config.get('DATABASE_URL'),
            },
          },
          config: { schema: { ...schema } },
        };
      },
    }),
    NatsJetStreamModule.registerAsync({
      inject: [EnvService],
      useFactory(config: EnvService) {
        return {
          connection: {
            servers: [config.get('NATS_SERVER_URL')],
          },
          appName: 'backend',
          queue: 'processing-group',
          deliverPolicy: DeliverPolicy.New,
          ackPolicy: AckPolicy.Explicit,
          multiStream: {
            streams: [
              {
                name: JetStreamStream.EVENTS,
                description: 'Stream for external event notifications',
                subjects: [
                  JetStreamSubject.MESSAGE_EVENT,
                  JetStreamSubject.OSU_CHAT_EVENT,
                ],
                duplicate_window: 10_000_000_000,
                max_age: 60_000_000_000,
              },
              {
                name: JetStreamStream.COMMANDS,
                description: 'Stream for backend-issued commands',
                subjects: [
                  JetStreamSubject.OSU_CREATE_PRIVATE_MATCH,
                  JetStreamSubject.OSU_CLOSE_MATCH,
                ],
                duplicate_window: 10_000_000_000,
              },
            ],
            defaultStream: JetStreamStream.EVENTS,
            streamConsumers: new Map<
              string,
              {
                ack_policy: AckPolicy;
                deliver_policy: DeliverPolicy;
              }
            >([
              [
                JetStreamStream.EVENTS,
                {
                  ack_policy: AckPolicy.Explicit,
                  deliver_policy: DeliverPolicy.New,
                },
              ],
              [
                JetStreamStream.COMMANDS,
                {
                  ack_policy: AckPolicy.Explicit,
                  deliver_policy: DeliverPolicy.New,
                },
              ],
            ]),
            patternToStream: new Map<string, string>([
              [JetStreamSubject.MESSAGE_EVENT, JetStreamStream.EVENTS],
              [JetStreamSubject.OSU_CHAT_EVENT, JetStreamStream.EVENTS],
              [
                JetStreamSubject.OSU_CREATE_PRIVATE_MATCH,
                JetStreamStream.COMMANDS,
              ],
              [JetStreamSubject.OSU_CLOSE_MATCH, JetStreamStream.COMMANDS],
            ]),
          },
        };
      },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
