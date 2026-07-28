import { beatmapCoverUrl } from './beatmap-cover-url';

describe('beatmapCoverUrl', () => {
  it('builds the canonical high-resolution osu cover URL', () => {
    expect(beatmapCoverUrl(123)).toBe(
      'https://assets.ppy.sh/beatmaps/123/covers/cover@2x.jpg',
    );
  });
});
