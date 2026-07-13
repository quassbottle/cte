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
      } as PolicyRequest),
    ).toBe(true);
    expect(
      resolver.supports({
        method: 'GET',
        originalUrl: '/api/tournaments/tournament-id/mappools',
      } as PolicyRequest),
    ).toBe(false);
  });
});
