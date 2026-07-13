import { extractQualificationAttempts } from './qualification-attempts';

describe('extractQualificationAttempts', () => {
  it('extracts every completed attempt on an allowed beatmap', () => {
    const snapshot = {
      closedAt: null,
      games: [
        {
          id: 1,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [
            { userId: 10, score: 900_000, team: null },
            { userId: 20, score: 800_000, team: null },
          ],
        },
        {
          id: 2,
          beatmapId: 101,
          endedAt: null,
          scores: [{ userId: 10, score: 999_999, team: null }],
        },
        {
          id: 3,
          beatmapId: 202,
          endedAt: new Date(),
          scores: [{ userId: 10, score: 999_999, team: null }],
        },
        {
          id: 4,
          beatmapId: 101,
          endedAt: new Date(),
          scores: [{ userId: 10, score: 950_000, team: null }],
        },
      ],
    };

    expect(extractQualificationAttempts(snapshot, new Set([101]))).toEqual([
      { osuGameId: 1, osuBeatmapId: 101, osuUserId: 10, score: 900_000 },
      { osuGameId: 1, osuBeatmapId: 101, osuUserId: 20, score: 800_000 },
      { osuGameId: 4, osuBeatmapId: 101, osuUserId: 10, score: 950_000 },
    ]);
  });
});
