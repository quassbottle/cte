import { Config } from 'core/config';
import { OsuAuth, OsuClient } from 'core/osu';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { inject, injectable } from 'tsyringe';

@injectable()
export class OsuService {
  private readonly auth: OsuAuth;

  constructor(@inject(DI_TOKENS.config) config: Config) {
    const osuClientId = config.osuClientId;
    const osuClientSecret = config.osuClientSecret;
    const osuRedirectUrl = config.osuRedirectUrl;

    this.auth = new OsuAuth(osuClientId, osuClientSecret, osuRedirectUrl);
  }

  public async getGuestClient() {
    const token = await this.auth.clientCredentialsGrant();
    return new OsuClient(token.access_token);
  }

  public getClient() {
    return new OsuClient(Config.osuAccessToken);
  }
}
