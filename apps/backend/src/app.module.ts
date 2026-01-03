import { DrizzlePGModule } from '@knaadh/nestjs-drizzle-pg';
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { EnvService } from 'lib/common/env/env.service';
import { AuthModule } from 'modules/auth/auth.module';
import { UserModule } from 'modules/user/user.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { EnvModule } from './lib/common/env/env.module';
import * as schema from './lib/infrastructure/db/schema';

@Module({
  imports: [
    EnvModule,
    AuthModule,
    UserModule,
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
