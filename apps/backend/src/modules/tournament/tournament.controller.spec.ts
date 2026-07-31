jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { ForbiddenException } from '@nestjs/common';
import { TournamentController } from './tournament.controller';

describe('TournamentController deleted reads', () => {
  const service = {
    findMany: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockResolvedValue({ isTeam: false }),
    getParticipantsCount: jest.fn().mockResolvedValue(0),
    getParticipantsCountMap: jest.fn().mockResolvedValue(new Map()),
  };
  const controller = new TournamentController(
    service as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('forbids the deleted list for a non-admin', async () => {
    await expect(
      controller.findMany(
        { limit: 20, offset: 0, status: 'deleted' },
        { role: 'default' } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('includes deleted detail data for an admin', async () => {
    await controller.getById(
      'ckm123456789012345678901' as never,
      { role: 'admin' } as never,
    );

    expect(service.getById).toHaveBeenCalledWith({
      id: 'ckm123456789012345678901',
      includeDeleted: true,
    });
  });
});
