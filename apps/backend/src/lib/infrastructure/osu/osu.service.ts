import { Injectable } from '@nestjs/common';
import { EnvService } from 'lib/common/env/env.service';
import { Auth, buildUrl, Client, Scope } from 'osu-web.js';

const DEFAULT_SCOPES: Scope[] = ['identify'];

@Injectable()
export class OsuService {
  private readonly auth: Auth;
  private readonly redirectUrl: string;
  private readonly clientId: number;
  private readonly clientSecret: string;

  constructor(private readonly envService: EnvService) {
    const osuClientId = this.envService.get('OSU_CLIENT_ID');
    const osuClientSecret = this.envService.get('OSU_CLIENT_SECRET');
    const osuRedirectUrl = this.envService.get('OSU_REDIRECT_URL');

    this.redirectUrl = osuRedirectUrl;
    this.clientId = osuClientId;
    this.clientSecret = osuClientSecret;

    this.auth = new Auth(osuClientId, osuClientSecret, osuRedirectUrl);
  }

  public async getGuestClient() {
    const token = await this.auth.clientCredentialsGrant();
    return new Client(token.access_token);
  }

  public getAuthUrl() {
    const url = buildUrl.authRequest(
      this.clientId,
      this.redirectUrl,
      DEFAULT_SCOPES,
    );

    return url;
  }

  public async authenticateUser(params: { code: string }) {
    const { code } = params;

    const authCodeGrant = this.auth.authorizationCodeGrant(DEFAULT_SCOPES);
    const token = await authCodeGrant.requestToken(code);

    return token;
  }

  public getUserClient(params: { accessToken: string }) {
    const { accessToken } = params;
    return new Client(accessToken);
  }
}
