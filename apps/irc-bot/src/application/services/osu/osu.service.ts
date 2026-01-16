import { Config } from 'core/config';
import { OnModuleInit } from 'core/types/lifecycle';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { logger } from 'infrastructure/logger';
import { auth, v2 } from 'osu-api-extended';
import { inject, injectable } from 'tsyringe';

const CACHED_TOKEN_PATH = './token.json';

@injectable()
export class OsuService implements OnModuleInit {
  constructor(@inject(DI_TOKENS.config) private readonly config: Config) {}

  async onModuleInit() {
    logger.info(`[OsuService]: Authorizing...`);

    logger.info(
      await auth.login({
        type: 'v2',
        client_id: this.config.osu.clientId,
        client_secret: this.config.osu.clientSecret,
        scopes: ['public'],
        cached_token_path: CACHED_TOKEN_PATH,
      }),
    );

    logger.info(`[OsuService]: Authorized!`);
  }

  public getClient() {
    return v2;
  }
}
