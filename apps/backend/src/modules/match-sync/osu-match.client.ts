import { Injectable } from '@nestjs/common';
import { OsuService } from 'lib/infrastructure/osu/osu.service';
import { OsuMatchSnapshot } from './types';

@Injectable()
export class OsuMatchClient {
  constructor(private readonly osu: OsuService) {}

  public get(osuMatchId: number): Promise<OsuMatchSnapshot> {
    return this.osu.getMatchSnapshot({ osuMatchId });
  }
}
