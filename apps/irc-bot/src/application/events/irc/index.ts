import { MatchService } from 'application/services/match/match.service';
import { OsuIrcEvent, OsuIrcEventBus } from 'core/bus/irc';
import { OsuIrcClient } from 'core/irc';
import { delay } from 'core/utils/delay';
import { container } from 'infrastructure/di';

const createIrcRawBus = (client: OsuIrcClient): OsuIrcEventBus => {
  const bus = new OsuIrcEventBus(client);

  // bus.use((context) => {});

  bus.on(OsuIrcEvent.RPL_CREATIONTIME, async (data, meta) => {
    console.log('Event Bus - Account creation time received:', data);

    const matchService = container.resolve(MatchService);

    const newMatch = await matchService.create(data);
    console.log(newMatch);

    meta.client.mpPassword(newMatch.channel, { password: 'test' });
    meta.client.mpInvite(newMatch.channel, { username: '-Nervi' });

    await delay(120_000);

    const closedMatch = await matchService.close({
      osuMatchId: newMatch.matchId,
    });

    console.log(closedMatch);
  });

  return bus;
};

export { createIrcRawBus };
