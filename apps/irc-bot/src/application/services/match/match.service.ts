import { OsuRplCreationTimeArgs } from 'core/bus/irc';
import { OsuIrcClient } from 'core/irc';
import { Database, matches } from 'infrastructure/db';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { inject, injectable } from 'tsyringe';

import { eq } from 'drizzle-orm';
import { OsuService } from '../osu/osu.service';
import { mpChannelToId } from './utils';

@injectable()
export class MatchService {
  constructor(
    @inject(DI_TOKENS.osuIrcClient)
    private readonly osuIrcClient: OsuIrcClient,
    @inject(DI_TOKENS.database)
    private readonly db: Database,
    @inject(OsuService)
    private readonly osuService: OsuService,
  ) {}

  public async create(params: OsuRplCreationTimeArgs) {
    const { channel, creationTime } = params;

    const matchId = mpChannelToId(channel);

    try {
      const osuMatchData = await this.osuService
        .getClient()
        .getMatch({ matchId });

      if (!osuMatchData) {
        throw new Error(); // TODO: refactor!!!
      }

      const [created] = await this.db
        .insert(matches)
        .values({
          channel,
          creationTime,
          name: osuMatchData.match.name,
          matchId,
        })
        .returning();

      return created;
    } catch (e) {
      console.log(`Reverting... Error on match creation: `, e);

      this.osuIrcClient.mpClose(channel);

      throw e;
    }
  }

  public async close(params: { osuMatchId: number }) {
    const { osuMatchId } = params;

    const candidate = await this.db.query.matches.findFirst({
      where: eq(matches.matchId, osuMatchId),
    });

    if (!candidate) {
      return null;
    }

    this.osuIrcClient.mpClose(candidate.channel);

    return this.db
      .update(matches)
      .set({ closed: true })
      .where(eq(matches.matchId, osuMatchId))
      .returning();
  }
}
