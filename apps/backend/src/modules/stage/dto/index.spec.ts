jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
  isCuid: jest.fn(() => true),
}));

import {
  stageStatisticsDtoSchema,
  stageStatisticsQuerySchema,
} from './index';

describe('stage statistics schemas', () => {
  it('parses the player view', () => {
    expect(
      stageStatisticsQuerySchema.parse({
        view: 'players',
        sortDirection: 'desc',
      }),
    ).toEqual({ view: 'players', sortDirection: 'desc' });
  });

  it('accepts a team name on a player row', () => {
    const result = stageStatisticsDtoSchema.parse({
      stageId: 'tz4a98xxat96iws9zmbrgj3a',
      maps: [],
      competitors: [
        {
          id: 'user',
          name: 'Player',
          avatarUrl: 'https://a.ppy.sh/42',
          teamName: 'Japan',
          maps: [],
        },
      ],
    });

    expect(result.competitors[0].teamName).toBe('Japan');
    expect(result.competitors[0].avatarUrl).toBe('https://a.ppy.sh/42');
  });
});
