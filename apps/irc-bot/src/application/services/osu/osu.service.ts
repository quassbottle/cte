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
        type: 'lazer',
        login: this.config.osu.login,
        password: this.config.osu.password,
        cached_token_path: CACHED_TOKEN_PATH,
      }),
    );

    logger.info(`[OsuService]: Authorized!`);
  }

  public getClient() {
    return v2;
  }
}
