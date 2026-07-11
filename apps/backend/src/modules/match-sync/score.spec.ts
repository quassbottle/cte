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
            { userId: 11, score: 10 },
            { userId: 22, score: 5 },
          ],
        },
        {
          id: 2,
          beatmapId: 102,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 4 },
            { userId: 22, score: 8 },
          ],
        },
        {
          id: 3,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 7 },
            { userId: 22, score: 7 },
          ],
        },
        {
          id: 4,
          beatmapId: 999,
          endedAt: new Date(),
          scores: [
            { userId: 11, score: 99 },
            { userId: 22, score: 1 },
          ],
        },
        {
          id: 5,
          beatmapId: 101,
          endedAt: null,
          scores: [
            { userId: 11, score: 99 },
            { userId: 22, score: 1 },
          ],
        },
        {
          id: 6,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [{ userId: 11, score: 99 }],
        },
      ],
    };

    expect(
      calculateMatchPoints({
        snapshot,
        playerOsuIds: [11, 22],
        allowedBeatmapIds: new Set([101, 102]),
      }),
    ).toEqual(
      new Map([
        [11, 1],
        [22, 1],
      ]),
    );
  });
});
