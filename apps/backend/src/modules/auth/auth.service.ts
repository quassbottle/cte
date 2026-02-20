import { Injectable } from '@nestjs/common';
import { DbUser } from 'lib/infrastructure/db';
import { OsuService } from 'lib/infrastructure/osu/osu.service';
import { UserService } from 'modules/user/user.service';
import { UserExtended } from 'osu-web.js';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly osuService: OsuService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  public async login(params: { code: string }) {
    const { code } = params;

    const token = await this.osuService.authenticateUser({ code });

    console.log({ token });

    const osuClient = this.osuService.getUserClient({
      accessToken: token.access_token,
    });

    const osuUser = await osuClient.users.getSelf();

    const candidate = await this.ensureDomainUserExists(osuUser);

    return this.jwtService.signJwtToken({ id: candidate.id });
  }

  public getAuthUrl() {
    return {
      url: this.osuService.getAuthUrl(),
    };
  }

  private async ensureDomainUserExists(user: UserExtended): Promise<DbUser> {
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
}
