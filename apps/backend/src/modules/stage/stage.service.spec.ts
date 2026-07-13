jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { StageExceptionCode } from 'lib/domain/stage/stage.exception';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { createStageDtoSchema, updateStageDtoSchema } from './dto';
import { StageService } from './stage.service';

describe('stage DTO', () => {
  const input = {
    name: 'Qualifier',
    startsAt: '2026-07-13T12:00:00.000Z',
    endsAt: '2026-07-13T13:00:00.000Z',
  };

  it('defaults new stages to regular', () => {
    expect(createStageDtoSchema.parse(input).type).toBe('regular');
  });

  it('accepts qualification stages', () => {
    expect(
      createStageDtoSchema.parse({ ...input, type: 'qualification' }).type,
    ).toBe('qualification');
  });

  it('allows changing a stage to qualification', () => {
    expect(updateStageDtoSchema.parse({ type: 'qualification' }).type).toBe(
      'qualification',
    );
  });
});

describe('StageService qualification stages', () => {
  const tournamentId = 'ckm123456789012345678901' as TournamentId;
  const stageId = 'ckm123456789012345678902' as StageId;
  const startsAt = new Date('2026-07-13T12:00:00.000Z');
  const endsAt = new Date('2026-07-13T13:00:00.000Z');

  const createService = (params?: {
    existing?: object | null;
    insertError?: unknown;
  }) => {
    const returning = params?.insertError
      ? jest.fn().mockRejectedValue(params.insertError)
      : jest.fn().mockResolvedValue([{ id: stageId }]);
    const drizzle = {
      query: {
        stages: {
          findFirst: jest.fn().mockResolvedValue(params?.existing ?? null),
        },
      },
      insert: jest.fn(() => ({
        values: jest.fn(() => ({ returning })),
      })),
    };

    return new StageService(drizzle as never);
  };

  it('rejects a second active qualification stage', async () => {
    const service = createService({ existing: { id: stageId } });

    const error = await service
      .create({
        tournamentId,
        name: 'Qualifier',
        type: 'qualification',
        startsAt,
        endsAt,
      })
      .catch((caught: { getResponse(): unknown }) => caught);

    expect((error as { getResponse(): unknown }).getResponse()).toMatchObject({
      errorCode: StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
    });
  });

  it('translates only the qualification uniqueness violation', async () => {
    const service = createService({
      insertError: {
        code: '23505',
        constraint: 'stages_one_qualification_per_tournament',
      },
    });

    const error = await service
      .create({
        tournamentId,
        name: 'Qualifier',
        type: 'qualification',
        startsAt,
        endsAt,
      })
      .catch((caught: { getResponse(): unknown }) => caught);

    expect((error as { getResponse(): unknown }).getResponse()).toMatchObject({
      errorCode: StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
    });
  });

  it('does not translate unrelated uniqueness violations', async () => {
    const error = { code: '23505', constraint: 'stages_pkey' };
    const service = createService({ insertError: error });

    await expect(
      service.create({
        tournamentId,
        name: 'Qualifier',
        type: 'qualification',
        startsAt,
        endsAt,
      }),
    ).rejects.toBe(error);
  });

  it('rejects changing another stage to qualification', async () => {
    const drizzle = {
      query: {
        stages: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              id: stageId,
              tournamentId,
              type: 'regular',
              startsAt,
              endsAt,
            })
            .mockResolvedValueOnce({ id: 'existing-qualification' }),
        },
      },
    };
    const service = new StageService(drizzle as never);

    const error = await service
      .update({
        id: stageId,
        tournamentId,
        data: { type: 'qualification' },
      })
      .catch((caught: { getResponse(): unknown }) => caught);

    expect((error as { getResponse(): unknown }).getResponse()).toMatchObject({
      errorCode: StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
    });
  });
});
