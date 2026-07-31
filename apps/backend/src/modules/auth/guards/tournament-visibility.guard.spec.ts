jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { ExecutionContext } from '@nestjs/common';
import { TournamentVisibilityGuard } from './tournament-visibility.guard';

const id = 'ckm123456789012345678901';

const context = (request: {
  method?: string;
  params?: { id?: string; tournamentId?: string };
  user?: { role: 'default' | 'admin' };
}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        params: {},
        ...request,
      }),
    }),
  }) as ExecutionContext;

const guard = (tournament: { deletedAt: Date | null } | undefined) =>
  new TournamentVisibilityGuard({
    query: {
      tournaments: {
        findFirst: jest.fn().mockResolvedValue(tournament),
      },
    },
  } as never);

describe('TournamentVisibilityGuard', () => {
  it('hides a deleted tournament from an anonymous viewer', async () => {
    await expect(
      guard({ deletedAt: new Date() }).canActivate(
        context({ params: { id } }),
      ),
    ).rejects.toThrow('Tournament not found');
  });

  it('allows an administrator to read a deleted tournament', async () => {
    await expect(
      guard({ deletedAt: new Date() }).canActivate(
        context({ params: { tournamentId: id }, user: { role: 'admin' } }),
      ),
    ).resolves.toBe(true);
  });

  it('leaves collection and mutation requests alone', async () => {
    const visibility = guard(undefined);

    await expect(
      visibility.canActivate(context({ params: {} })),
    ).resolves.toBe(true);
    await expect(
      visibility.canActivate(
        context({ method: 'DELETE', params: { id } }),
      ),
    ).resolves.toBe(true);
  });
});
