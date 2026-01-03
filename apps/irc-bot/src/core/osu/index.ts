import { Config } from 'core/config';
import { Auth, Client } from 'osu-web.js';
import { osuApiRequest } from './osu.api';
import { OsuAuthResponse, OsuMatchResponse } from './osu.types';
import { isError } from './osu.utils';

// TODO: Stop using this stupid legacy library. It can't do anything I need

export class OsuClient extends Client {
  constructor(
    accessToken: string,
    options?: {
      polyfillFetch: undefined;
    },
  ) {
    super(accessToken, options);
  }

  public async getMatch(params: { matchId: number }) {
    const { matchId } = params;

    const result = await osuApiRequest<OsuMatchResponse>({
      method: 'GET',
      resource: `api/v2/matches/${matchId}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (isError(result) || !result.result) return null;

    return result.result;
  }
}

export class OsuAuth extends Auth {
  constructor(clientId: number, clientSecret: string, redirectUri: string) {
    super(clientId, clientSecret, redirectUri, { polyfillFetch: fetch });
  }

  public async refreshToken(refresh: string) {
    const result = await osuApiRequest<OsuAuthResponse>({
      method: 'POST',
      resource: 'oauth/token',
      body: {
        client_id: Config.osuClientId,
        client_secret: Config.osuClientSecret,
        refresh_token: refresh,
        grant_type: 'refresh_token',
        redirect_uri: Config.osuRedirectUrl,
      },
    });

    if (isError(result)) {
      return null;
    }

    return result.result!;
  }
}
