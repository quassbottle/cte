import { MatchService } from 'application/services/match/match.service';
import { isMpChannel } from 'application/services/match/utils';
import { MessageService } from 'application/services/message/message.service';
import { OsuIrcEvent, OsuIrcEventBus } from 'core/bus/irc';
import { OsuIrcClient } from 'core/irc';
import { JetStreamPublisher } from 'core/jetstream';
import { JetStreamSubject } from 'core/jetstream/constants';
import { delay } from 'core/utils/delay';
import { container } from 'infrastructure/di';
import { logger } from 'infrastructure/logger';

const createIrcRawBus = (client: OsuIrcClient): OsuIrcEventBus => {
  const bus = new OsuIrcEventBus(client);

  // bus.use((context) => {});

  bus.on(OsuIrcEvent.PRIVMSG, async (data) => {
    // logger.info(
    //   { channel: data.channel, user: data.user, message: data.message },
    //   'IRC PRIVMSG',
    // );

    const messageService = container.resolve(MessageService);
    const publisher = container.resolve(JetStreamPublisher);

    await publisher.publish({
      subject: JetStreamSubject.MESSAGE_EVENT,
      payload: data,
    });

    await messageService.create(data);
  });

  bus.on(OsuIrcEvent.RPL_CREATIONTIME, async (data, meta) => {
    logger.info({ data }, 'Account creation time received');

    if (!isMpChannel(data.channel)) {
      logger.info({ channel: data.channel }, 'Received non-mp match channel');
      return;
    }

    const matchService = container.resolve(MatchService);

    const newMatch = await matchService.create(data);
    logger.info({ match: newMatch }, 'Match created');

    meta.client.mpPassword(newMatch.channel, { password: 'test' });
    meta.client.mpInvite(newMatch.channel, { username: 'EndlessLove' });

    await delay(60_000);

    const closedMatch = await matchService.close({
      osuMatchId: newMatch.matchId,
    });

    logger.info({ match: closedMatch }, 'Match closed');
  });

  return bus;
};

export { createIrcRawBus };
