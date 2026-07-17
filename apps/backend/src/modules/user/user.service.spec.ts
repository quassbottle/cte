jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { UserService } from './user.service';

const containsValue = (
  value: unknown,
  expected: unknown,
  seen = new Set<object>(),
): boolean => {
  if (value === expected) return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((nested) =>
    containsValue(nested, expected, seen),
  );
};

describe('UserService', () => {
  it('looks up users by a partial username', async () => {
    let condition: unknown;
    const user = { id: 'user-id', osuUsername: 'taikoshallah' };
    const findFirst = jest.fn(({ where }: { where: unknown }) => {
      condition = where;
      return Promise.resolve(user);
    });
    const service = new UserService({
      query: { users: { findFirst } },
    } as never);

    await expect(service.getByLookup({ query: 'taiko' })).resolves.toBe(user);
    expect(containsValue(condition, '%taiko%')).toBe(true);
  });
});
