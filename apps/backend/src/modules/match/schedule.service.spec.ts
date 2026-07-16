import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  it('loads all match results in one batch', async () => {
    const schedule = [
      {
        id: 'stage',
        matches: [
          { id: 'match-1', players: [] },
          { id: 'match-2', players: [] },
        ],
      },
    ];
    const db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn().mockResolvedValue(schedule),
          })),
        })),
      })),
    };
    const results = {
      get: jest.fn(),
      getMany: jest.fn().mockResolvedValue(
        new Map([
          ['match-1', { redScore: 1, blueScore: 0, players: [] }],
          ['match-2', { redScore: 0, blueScore: 1, players: [] }],
        ]),
      ),
    };

    await new ScheduleService(db as never, results as never).findByTournament({
      tournamentId: 'tournament' as never,
    });

    expect(results.getMany).toHaveBeenCalledWith(['match-1', 'match-2']);
    expect(results.get).not.toHaveBeenCalled();
  });
});
