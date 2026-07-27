jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
  isCuid: jest.fn(() => true),
}));

import { qualificationLobbyDtoSchema } from '.';

describe('qualificationLobbyDtoSchema', () => {
  it('returns synchronized player score details', () => {
    const attempt = {
      beatmapId: 1,
      gameId: 2,
      osuUserId: 3,
      userId: null,
      userName: 'Player',
      score: 961684,
      mods: ['HD', 'HR'],
      maxCombo: 1457,
      accuracy: 0.9872,
      rank: 'A',
      great: 1463,
      ok: 16,
      miss: 11,
      counted: true,
    };

    const lobby = qualificationLobbyDtoSchema.parse({
      id: 'lobby',
      stageId: 'stage',
      number: 1,
      referee: {
        id: 'referee',
        osuId: 4,
        osuUsername: 'Referee',
        avatarUrl: 'https://a.ppy.sh/4',
        role: 'referee',
      },
      startsAt: '2026-07-19T10:00:00.000Z',
      endsAt: '2026-07-19T12:00:00.000Z',
      players: [],
      teams: [],
      seatCount: 0,
      syncStatus: 'completed',
      lastSyncedAt: null,
      attempts: [attempt],
      standings: [
        {
          competitorId: 'team',
          beatmapId: 1,
          gameId: 2,
          score: 961684,
          place: 1,
        },
      ],
    });

    expect(lobby.attempts[0]).toEqual(attempt);
    expect(lobby.referee.avatarUrl).toBe('https://a.ppy.sh/4');
  });

  it.each(['mods', 'maxCombo', 'accuracy', 'rank'] as const)(
    'rejects a synchronized score without %s',
    (field) => {
      expect(() =>
        qualificationLobbyDtoSchema.shape.attempts.element.parse({
          beatmapId: 1,
          gameId: 2,
          osuUserId: 3,
          userId: null,
          userName: 'Player',
          score: 961684,
          mods: [],
          maxCombo: 1457,
          accuracy: 0.9872,
          rank: 'A',
          great: null,
          ok: null,
          miss: null,
          counted: false,
          [field]: null,
        }),
      ).toThrow();
    },
  );
});
