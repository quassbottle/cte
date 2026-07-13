jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { scheduleMatchUpsertDtoSchema } from './index';

describe('scheduleMatchUpsertDtoSchema', () => {
  it('accepts a complete schedule match payload', () => {
    const parsed = scheduleMatchUpsertDtoSchema.parse({
      name: 'Grand Finals',
      stageId: 'ckm123456789012345678901',
      matchNumber: 1,
      startsAt: '2026-07-10T16:00:00.000Z',
      endsAt: '2026-07-10T17:00:00.000Z',
      mpUrl: null,
      vodUrl: 'https://example.com/vod',
      players: [
        { userId: 'cku123456789012345678901', score: 6 },
        { userId: 'cku123456789012345678902', score: 4 },
      ],
      staff: [
        { userId: 'cku123456789012345678903', role: 'referee' },
        { userId: 'cku123456789012345678904', role: 'streamer' },
      ],
    });

    expect(parsed.players).toHaveLength(2);
    expect(parsed.staff).toHaveLength(2);
  });

  it('accepts a team match payload', () => {
    const parsed = scheduleMatchUpsertDtoSchema.parse({
      name: 'Team Finals',
      stageId: 'ckm123456789012345678901',
      startsAt: '2026-07-10T16:00:00.000Z',
      endsAt: '2026-07-10T17:00:00.000Z',
      redTeamId: 'ckt123456789012345678901',
      blueTeamId: 'ckt123456789012345678902',
      players: [],
      staff: [],
    });

    expect(parsed.redTeamId).toBe('ckt123456789012345678901');
    expect(parsed.blueTeamId).toBe('ckt123456789012345678902');
  });

  it('rejects matches ending before they start', () => {
    const result = scheduleMatchUpsertDtoSchema.safeParse({
      name: 'Grand Finals',
      stageId: 'ckm123456789012345678901',
      startsAt: '2026-07-10T17:00:00.000Z',
      endsAt: '2026-07-10T16:00:00.000Z',
      players: [],
      staff: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects multiple streamers', () => {
    const result = scheduleMatchUpsertDtoSchema.safeParse({
      name: 'Grand Finals',
      stageId: 'ckm123456789012345678901',
      startsAt: '2026-07-10T16:00:00.000Z',
      endsAt: '2026-07-10T17:00:00.000Z',
      players: [],
      staff: [
        { userId: 'cku123456789012345678903', role: 'streamer' },
        { userId: 'cku123456789012345678904', role: 'streamer' },
      ],
    });

    expect(result.success).toBe(false);
  });
});
