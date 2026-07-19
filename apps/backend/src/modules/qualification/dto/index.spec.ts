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
    };

    const lobby = qualificationLobbyDtoSchema.parse({
      id: 'lobby',
      stageId: 'stage',
      number: 1,
      refereeId: 'referee',
      refereeName: 'Referee',
      startsAt: '2026-07-19T10:00:00.000Z',
      endsAt: '2026-07-19T12:00:00.000Z',
      players: [],
      teams: [],
      seatCount: 0,
      syncStatus: 'completed',
      lastSyncedAt: null,
      attempts: [attempt],
    });

    expect(lobby.attempts[0]).toEqual(attempt);
  });
});
