import { Injectable } from '@nestjs/common';
import { EnvService } from 'lib/common/env/env.service';
import { auth, v2 } from 'osu-api-extended';

export enum OsuApiMode {
  Osu = 'osu',
  Taiko = 'taiko',
  Fruits = 'fruits',
  Mania = 'mania',
}

const OSU_API_MODE_VALUES = new Set<string>(Object.values(OsuApiMode));

type OsuUserClient = {
  users: {
    getSelf(params?: {
      urlParams?: {
        mode?: OsuApiMode;
      };
    }): Promise<OsuUserProfile>;
  };
};

const DEFAULT_SCOPES = ['identify'] as const;
const CACHED_TOKEN_PATH = './osu-api-backend-token.json';

@Injectable()
export class OsuService {
  private readonly redirectUrl: string;
  private readonly clientId: number;
  private readonly clientSecret: string;
  private guestAuthPromise: Promise<unknown> | null = null;

  constructor(private readonly envService: EnvService) {
    const osuClientId = this.envService.get('OSU_CLIENT_ID');
    const osuClientSecret = this.envService.get('OSU_CLIENT_SECRET');
    const osuRedirectUrl = this.envService.get('OSU_REDIRECT_URL');

    this.redirectUrl = osuRedirectUrl;
    this.clientId = osuClientId;
    this.clientSecret = osuClientSecret;
  }

  public async getGuestClient(): Promise<OsuUserClient> {
    await this.ensureGuestAuthorized();

    return this.createClient();
  }

  public getAuthUrl() {
    return auth.build_url({
      client_id: this.clientId,
      redirect_url: this.redirectUrl,
      scopes: [...DEFAULT_SCOPES],
    });
  }

  public async authenticateUser(params: { code: string }) {
    const { code } = params;

    const token = await auth.authorize({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_url: this.redirectUrl,
    });

    return token;
  }

  public getUserClient(params: { accessToken: string }): OsuUserClient {
    const { accessToken } = params;

    return this.createClient(accessToken);
  }

  public async getBeatmapDetails(params: {
    osuBeatmapId: number;
  }): Promise<OsuBeatmapDetails> {
    const { osuBeatmapId } = params;

    await this.ensureGuestAuthorized();

    const result = await v2.beatmaps.details({
      type: 'difficulty',
      id: osuBeatmapId,
    });

    if (result.error != null) {
      throw result.error;
    }

    return {
      ...result,
      mode: this.parseMode(result.mode),
    };
  }

  private createClient(accessToken?: string): OsuUserClient {
    return {
      users: {
        getSelf: async (params) => {
          if (!accessToken) {
            throw new Error(
              'User access token is required to fetch own profile',
            );
          }

          auth.set_v2(accessToken);

          const result = await v2.me.details({
            mode: params?.urlParams?.mode,
          });

          if (result.error != null) {
            throw result.error;
          }

          return result;
        },
      },
    };
  }

  private async ensureGuestAuthorized(): Promise<void> {
    this.guestAuthPromise ??= Promise.resolve(
      auth.login({
        type: 'v2',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        cached_token_path: CACHED_TOKEN_PATH,
        scopes: ['public'],
      }),
    );

    const result = (await this.guestAuthPromise) as {
      error?: unknown;
    };

    if (result?.error != null) {
      this.guestAuthPromise = null;
      throw result.error;
    }
  }

  private parseMode(mode: string): OsuApiMode {
    if (OSU_API_MODE_VALUES.has(mode)) {
      return mode as OsuApiMode;
    }

    return OsuApiMode.Osu;
  }
}

type OsuUserProfile = {
  id: number;
  username: string;
  statistics?: {
    pp?: number | null;
    global_rank?: number | null;
  } | null;
  error?: unknown;
};

type OsuBeatmapDetails = {
  id: number;
  beatmapset_id: number;
  mode: OsuApiMode;
  difficulty_rating: number;
  version: string;
  ranked: number;
  beatmapset: {
    artist: string;
    title: string;
  };
  error?: unknown;
};
