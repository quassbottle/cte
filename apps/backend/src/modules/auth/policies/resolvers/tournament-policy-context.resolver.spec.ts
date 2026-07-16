jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { ForbiddenException } from '@nestjs/common';
import { PolicyRequest } from '../types';
import { TournamentPolicyContextResolver } from './tournament-policy-context.resolver';

describe('TournamentPolicyContextResolver', () => {
  const id = 'ckm123456789012345678901';

  it('supports management GET but leaves public tournament GET routes alone', () => {
    const resolver = new TournamentPolicyContextResolver({} as never);

    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: `/api/tournaments/${id}/participants/manage`,
      } as PolicyRequest),
    ).toBe(true);
    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: `/api/tournaments/${id}/participants/manage?view=all`,
      } as PolicyRequest),
    ).toBe(true);
    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: `/api/tournaments/${id}/participants`,
      } as PolicyRequest),
    ).toBe(false);
  });

  it('resolves the creator for management GET and nested calculation POST', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      creatorId: 'ckm123456789012345678902',
      archivedAt: null,
    });
    const resolver = new TournamentPolicyContextResolver({
      query: { tournaments: { findFirst } },
    } as never);

    for (const request of [
      {
        method: 'GET',
        originalUrl: `/api/tournaments/${id}/participants/manage`,
        params: { id },
      },
      {
        method: 'POST',
        originalUrl: `/api/tournaments/${id}/qualification/participants/user`,
        params: { id },
      },
    ]) {
      await expect(
        resolver.resolve(request as unknown as PolicyRequest),
      ).resolves.toEqual({
        subject: 'Tournament',
        subjectData: {
          __type: 'Tournament',
          creatorId: 'ckm123456789012345678902',
        },
      });
    }
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('uses create context only for collection POST', async () => {
    const findFirst = jest.fn();
    const resolver = new TournamentPolicyContextResolver({
      query: { tournaments: { findFirst } },
    } as never);

    await expect(
      resolver.resolve({
        method: 'POST',
        originalUrl: '/api/tournaments?source=host',
        params: {},
      } as unknown as PolicyRequest),
    ).resolves.toEqual({
      subject: 'Tournament',
      subjectData: { __type: 'Tournament' },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('denies management of archived tournaments', async () => {
    const resolver = new TournamentPolicyContextResolver({
      query: {
        tournaments: {
          findFirst: jest.fn().mockResolvedValue({
            creatorId: 'ckm123456789012345678902',
            archivedAt: new Date(),
          }),
        },
      },
    } as never);

    await expect(
      resolver.resolve({
        method: 'GET',
        originalUrl: `/api/tournaments/${id}/participants/manage`,
        params: { id },
      } as unknown as PolicyRequest),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
