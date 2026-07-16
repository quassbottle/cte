jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { staffRoleIdSchema } from 'lib/domain/staff-role/staff-role.id';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import z from 'zod';
import {
  qualificationRosterDtoSchema,
  tournamentParticipantDtoSchema,
  tournamentStaffRoleDtoSchema,
  tournamentTeamDtoSchema,
  updateQualificationCompetitorDtoSchema,
  updateQualificationTeamParticipantDtoSchema,
} from './index';

describe('qualification management schemas', () => {
  it('requires at least one editable field', () => {
    expect(updateQualificationCompetitorDtoSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      updateQualificationCompetitorDtoSchema.parse({
        withdrawn: false,
        withdrawalReason: ' ignored by service ',
      }),
    ).toEqual({
      withdrawn: false,
      withdrawalReason: 'ignored by service',
    });
  });

  it('does not allow manual qualification seeds', () => {
    expect(
      updateQualificationCompetitorDtoSchema.safeParse({ seed: 1 }).success,
    ).toBe(false);
    expect(
      updateQualificationTeamParticipantDtoSchema.safeParse({ seed: 1 })
        .success,
    ).toBe(false);
    expect(
      updateQualificationCompetitorDtoSchema.safeParse({
        seed: 2,
        withdrawn: true,
      }).success,
    ).toBe(false);
  });

  it('accepts discriminated solo and team rosters', () => {
    const user = {
      id: userIdSchema.parse('ckm123456789012345678901'),
      osuId: 42,
      osuUsername: 'player',
      avatarUrl: 'https://a.ppy.sh/42',
      withdrawn: false,
      withdrawalReason: null,
    };

    expect(
      qualificationRosterDtoSchema.parse({
        kind: 'solo',
        participants: [{ ...user, seed: 1 }],
      }).kind,
    ).toBe('solo');
    expect(
      qualificationRosterDtoSchema.parse({
        kind: 'team',
        teams: [
          {
            id: teamIdSchema.parse('ckm123456789012345678902'),
            name: 'Team',
            seed: 1,
            withdrawn: false,
            withdrawalReason: null,
            participants: [user],
          },
        ],
      }).kind,
    ).toBe('team');
  });
});

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
      participants: [{ ...participant, avatarUrl: 'https://a.ppy.sh/42' }],
    });
  });

  it('encodes staff members grouped by role', () => {
    expect(
      z.encode(tournamentStaffRoleDtoSchema, {
        id: staffRoleIdSchema.parse('ckm123456789012345678903'),
        name: 'Host',
        canParticipate: false,
        members: [participant],
      }),
    ).toEqual({
      id: 'ckm123456789012345678903',
      name: 'Host',
      canParticipate: false,
      members: [{ ...participant, avatarUrl: 'https://a.ppy.sh/42' }],
    });
  });
});
