import { parseOsuMatchId } from './mp-url';

describe('parseOsuMatchId', () => {
  it.each([
    ['https://osu.ppy.sh/community/matches/123', 123],
    ['https://osu.ppy.sh/mp/456', 456],
  ])('parses %s', (value, expected) => {
    expect(parseOsuMatchId(value)).toBe(expected);
  });

  it.each([
    'http://osu.ppy.sh/mp/1',
    'https://osu.ppy.sh/mp/1?x=1',
    'https://osu.ppy.sh/mp/1#score',
    'https://example.com/mp/1',
    'https://osu.ppy.sh/mp/1/extra',
  ])('rejects %s', (value) => {
    expect(parseOsuMatchId(value)).toBeNull();
  });
});
