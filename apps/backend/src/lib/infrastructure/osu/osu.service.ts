import { Injectable } from '@nestjs/common';
import { EnvService } from 'lib/common/env/env.service';
import { auth, v2 } from 'osu-api-extended';
import { z } from 'zod';

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

const osuMatchDetailsSchema = z.object({
  match: z.object({ end_time: z.string().nullable() }),
  latest_event_id: z.number(),
  events: z.array(
    z.object({
      id: z.number(),
      game: z
        .object({
          id: z.number(),
          beatmap_id: z.number(),
          end_time: z.string().nullable(),
          scores: z.array(
            z.object({
              user_id: z.number(),
              legacy_total_score: z.number(),
            }),
          ),
        })
        .optional(),
    }),
  ),
});

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

  public async getUserDetails(params: {
    osuUserId: number;
  }): Promise<OsuUserDetails> {
    const { osuUserId } = params;

    await this.ensureGuestAuthorized();

    const result = await v2.users.details({
      user: osuUserId,
      mode: OsuApiMode.Osu,
      key: 'id',
    });

    if (result.error != null) {
      throw result.error;
    }

    return {
      id: result.id,
      username: result.username,
      countryCode: result.country_code ?? null,
    };
  }

  public async getMatchSnapshot(params: {
    osuMatchId: number;
  }): Promise<OsuMatchSnapshot> {
    await this.ensureGuestAuthorized();

    const games = new Map<number, OsuMatchGame>();
    let after = 0;
    let closedAt: Date | null = null;

    while (true) {
      const result = await v2.matches.details({
        match_id: params.osuMatchId,
        after,
        limit: 100,
      });

      if (result.error != null) throw result.error;

      const match = osuMatchDetailsSchema.parse(result);
      closedAt = match.match.end_time ? new Date(match.match.end_time) : null;
      const eventIds = match.events.map((event) => event.id);

      for (const event of match.events) {
        if (!event.game) continue;
        games.set(event.game.id, {
          id: event.game.id,
          beatmapId: event.game.beatmap_id,
          endedAt: event.game.end_time ? new Date(event.game.end_time) : null,
          scores: event.game.scores.map((score) => ({
            userId: score.user_id,
            score: score.legacy_total_score,
          })),
        });
      }

      const nextAfter = Math.max(after, ...eventIds);
      if (nextAfter >= match.latest_event_id) break;
      if (nextAfter === after) {
        throw new Error(
          `osu match ${params.osuMatchId} pagination made no progress`,
        );
      }
      after = nextAfter;
    }

    return { closedAt, games: [...games.values()] };
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

    let result: { error?: unknown };
    try {
      result = (await this.guestAuthPromise) as { error?: unknown };
    } catch (error) {
      this.guestAuthPromise = null;
      throw error;
    }

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
  country_code?: string | null;
  cover_url?: string | null;
  playmode?: string | null;
  statistics?: {
    pp?: number | null;
    global_rank?: number | null;
  } | null;
  error?: unknown;
};

type OsuMatchSnapshot = {
  closedAt: Date | null;
  games: OsuMatchGame[];
};

type OsuMatchGame = {
  id: number;
  beatmapId: number;
  endedAt: Date | null;
  scores: { userId: number; score: number }[];
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

type OsuUserDetails = {
  id: number;
  username: string;
  countryCode: string | null;
};
