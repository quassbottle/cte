import { Injectable } from '@nestjs/common';
import { DbUser } from 'lib/infrastructure/db';
import { OsuApiMode, OsuService } from 'lib/infrastructure/osu/osu.service';
import { OsuStatsService } from 'modules/user/osu-stats.service';
import { UserService } from 'modules/user/user.service';
import { JwtService } from './jwt.service';

type OsuStatsMode = 'std' | 'taiko' | 'fruits' | 'mania';

const MODE_MAP: Record<OsuApiMode, OsuStatsMode> = {
  [OsuApiMode.Osu]: 'std',
  [OsuApiMode.Taiko]: 'taiko',
  [OsuApiMode.Fruits]: 'fruits',
  [OsuApiMode.Mania]: 'mania',
};

const AUTH_STATS_MODES: OsuApiMode[] = [
  OsuApiMode.Osu,
  OsuApiMode.Taiko,
  OsuApiMode.Fruits,
  OsuApiMode.Mania,
];

@Injectable()
export class AuthService {
  constructor(
    private readonly osuService: OsuService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly osuStatsService: OsuStatsService,
  ) {}

  public async login(params: { code: string }) {
    const { code } = params;

    const token = await this.osuService.authenticateUser({ code });

    const osuClient = this.osuService.getUserClient({
      accessToken: token.access_token,
    });

    const osuUser = await osuClient.users.getSelf();

    const candidate = await this.ensureDomainUserExists(osuUser);
    await this.saveStatsByModes({
      userId: candidate.id,
      token: token.access_token,
    });

    return this.jwtService.signJwtToken({ id: candidate.id });
  }

  public getAuthUrl() {
    return {
      url: this.osuService.getAuthUrl(),
    };
  }

  private async ensureDomainUserExists(user: OsuUserProfile): Promise<DbUser> {
    const userExists = await this.userService.existsByOsuId({ osuId: user.id });

    if (userExists) {
      return this.userService.getByOsuId({ osuId: user.id });
    }

    const newUser = await this.userService.create({
      osuId: user.id,
      osuUsername: user.username,
    });

    return newUser;
  }

  private async saveStatsByModes(params: {
    userId: DbUser['id'];
    token: string;
  }): Promise<void> {
    const { userId, token } = params;

    const osuClient = this.osuService.getUserClient({
      accessToken: token,
    });

    const usersByMode = await Promise.all(
      AUTH_STATS_MODES.map(async (mode) => ({
        mode,
        user: await osuClient.users.getSelf({
          urlParams: { mode },
        }),
      })),
    );

    await this.osuStatsService.upsertMany(
      usersByMode.map(({ mode, user }) => ({
        userId,
        osuId: user.id,
        mode: MODE_MAP[mode],
        performancePoints: user.statistics?.pp ?? null,
        rank: user.statistics?.global_rank ?? null,
      })),
    );
  }
}

type OsuUserProfile = {
  id: number;
  username: string;
  statistics?: {
    pp?: number | null;
    global_rank?: number | null;
  } | null;
};
