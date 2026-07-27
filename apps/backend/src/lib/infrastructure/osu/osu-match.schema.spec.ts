import { z } from 'zod';
import { osuMatchDetailsSchema } from './osu-match.schema';

describe('osuMatchDetailsSchema', () => {
  it('decodes and encodes Score V2 mods, team, and sparse statistics', () => {
    const input = {
      match: { end_time: null },
      latest_event_id: 1,
      events: [
        {
          id: 1,
          game: {
            id: 2,
            beatmap_id: 3,
            end_time: null,
            mods: [{ acronym: 'NF', settings: { restart: false } }],
            scores: [
              {
                user_id: 4,
                legacy_total_score: 5,
                mods: [{ acronym: 'HD' }],
                max_combo: 6,
                accuracy: 1,
                rank: 'X',
                statistics: { great: 7 },
                match: { team: 'none' },
              },
            ],
          },
        },
      ],
    };

    const decoded = osuMatchDetailsSchema.parse(input);

    expect(decoded.events[0].game?.scores[0]).toMatchObject({
      mods: ['NF', 'HD'],
      team: null,
      statistics: { great: 7, ok: 0, miss: 0 },
    });
    expect(z.encode(osuMatchDetailsSchema, decoded)).toMatchObject({
      events: [
        {
          game: {
            mods: [],
            scores: [
              {
                mods: [{ acronym: 'NF' }, { acronym: 'HD' }],
                match: { team: 'none' },
              },
            ],
          },
        },
      ],
    });
  });
});
