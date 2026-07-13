jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import z from 'zod';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import {
  tournamentParticipantDtoSchema,
  tournamentTeamDtoSchema,
} from './index';

describe('tournament response codecs', () => {
  const participant = {
    id: userIdSchema.parse('ckm123456789012345678901'),
    osuId: 42,
    osuUsername: 'player',
  };

  it('encodes database participants in API response shape', () => {
    expect(z.encode(tournamentParticipantDtoSchema, participant)).toEqual({
      ...participant,
      avatarUrl: 'https://a.ppy.sh/42',
    });
  });

  it('encodes nested team participants', () => {
    expect(
      z.encode(tournamentTeamDtoSchema, {
        id: teamIdSchema.parse('ckm123456789012345678902'),
        name: 'Team',
        captainId: participant.id,
        participants: [participant],
      }),
    ).toEqual({
      id: 'ckm123456789012345678902',
      name: 'Team',
      captainId: participant.id,
      participants: [
        { ...participant, avatarUrl: 'https://a.ppy.sh/42' },
      ],
    });
  });
});
