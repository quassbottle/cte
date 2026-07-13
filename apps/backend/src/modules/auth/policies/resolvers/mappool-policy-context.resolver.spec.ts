jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { PolicyRequest } from '../types';
import { MappoolPolicyContextResolver } from './mappool-policy-context.resolver';

describe('MappoolPolicyContextResolver', () => {
  const resolver = new MappoolPolicyContextResolver({} as never);

  it('supports only the protected mappool management GET route', () => {
    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: '/api/tournaments/tournament-id/mappools/manage',
      } as unknown as PolicyRequest),
    ).toBe(true);
    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: '/api/tournaments/tournament-id/mappools',
      } as PolicyRequest),
    ).toBe(false);
  });

  it('resolves a tournament ID from params without branching on the HTTP method', async () => {
    const tournament = {
      creatorId: 'ckm123456789012345678902',
      archivedAt: null,
    };
    const findFirst = jest.fn().mockResolvedValue(tournament);
    const resolver = new MappoolPolicyContextResolver({
      query: { tournaments: { findFirst } },
    } as never);

    await expect(
      resolver.resolve({
        method: 'POST',
        params: { tournamentId: 'ckm123456789012345678901' },
        body: {},
      } as unknown as PolicyRequest),
    ).resolves.toEqual({
      subject: 'Mappool',
      subjectData: {
        __type: 'Mappool',
        tournamentCreatorId: tournament.creatorId,
      },
    });
    expect(findFirst).toHaveBeenCalled();
  });

  it('uses the stage from a create body before the route tournament ID', async () => {
    const tournament = {
      creatorId: 'ckm123456789012345678902',
      archivedAt: null,
    };
    const resolver = new MappoolPolicyContextResolver({} as never);
    const byStage = jest
      .spyOn(resolver as any, 'resolveTournamentByStageId')
      .mockResolvedValue(tournament);
    const byTournament = jest.spyOn(resolver as any, 'resolveTournamentById');

    await resolver.resolve({
      method: 'POST',
      params: { tournamentId: 'ckm123456789012345678901' },
      body: { stageId: 'ckm123456789012345678903' },
    } as unknown as PolicyRequest);

    expect(byStage).toHaveBeenCalledWith('ckm123456789012345678903');
    expect(byTournament).not.toHaveBeenCalled();
  });
});
