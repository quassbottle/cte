import { OsuPrivMsgEventArgs } from 'core/bus/irc';
import { OsuIrcClient } from 'core/irc';
import { Database, messages } from 'infrastructure/db';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { inject, injectable } from 'tsyringe';

@injectable()
export class MessageService {
  constructor(
    @inject(DI_TOKENS.osuIrcClient)
    private readonly osuIrcClient: OsuIrcClient,
    @inject(DI_TOKENS.database)
    private readonly db: Database,
  ) {}

  public async create(data: OsuPrivMsgEventArgs) {
    const { channel, message, user } = data;

    const [created] = await this.db
      .insert(messages)
      .values({ channel, text: message, sender: user })
      .returning();

    return created;
  }
}
