import { calculateMatchPoints } from './score';
import { OsuMatchSnapshot } from './types';

describe('calculateMatchPoints', () => {
  it('counts only completed games on mappool maps and ignores ties', () => {
    const snapshot: OsuMatchSnapshot = {
      closedAt: null,
      games: [
        {
          id: 1,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 10, team: null },
            { userId: 22, score: 5, team: null },
          ],
        },
        {
          id: 2,
          beatmapId: 102,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 4, team: null },
            { userId: 22, score: 8, team: null },
          ],
        },
        {
          id: 3,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 7, team: null },
            { userId: 22, score: 7, team: null },
          ],
        },
        {
          id: 4,
          beatmapId: 999,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 99, team: null },
            { userId: 22, score: 1, team: null },
          ],
        },
        {
          id: 5,
          beatmapId: 101,
          endedAt: null,
          scores: [
            { userId: 11, score: 99, team: null },
            { userId: 22, score: 1, team: null },
          ],
        },
        {
          id: 6,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [{ userId: 11, score: 99, team: null }],
        },
      ],
    };

    expect(
      calculateMatchPoints({
        snapshot,
        kind: 'solo',
        playerOsuIds: [11, 22],
        allowedBeatmapIds: new Set([101, 102]),
      }),
    ).toEqual({ redScore: 1, blueScore: 1 });
  });

  it('counts team points from osu red and blue totals', () => {
    const snapshot: OsuMatchSnapshot = {
      closedAt: null,
      games: [
        {
          id: 1,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [
            { userId: 1, score: 400, team: 'red' },
            { userId: 2, score: 300, team: 'red' },
            { userId: 3, score: 600, team: 'blue' },
            { userId: 4, score: 200, team: 'blue' },
          ],
        },
      ],
    };

    expect(
      calculateMatchPoints({
        snapshot,
        allowedBeatmapIds: new Set([101]),
        kind: 'team',
      }),
    ).toEqual({ redScore: 0, blueScore: 1 });
  });
});
