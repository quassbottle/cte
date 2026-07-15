import { getTableConfig } from 'drizzle-orm/pg-core';
import { staffRoles, tournamentStaffMembers } from './schema';

describe('tournament staff schema', () => {
  it('stores global roles and prevents duplicate tournament role assignments', () => {
    expect(getTableConfig(staffRoles).columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['id', 'name']),
    );
    expect(
      getTableConfig(tournamentStaffMembers).primaryKeys[0]?.columns.map(
        (column) => column.name,
      ),
    ).toEqual(['tournament_id', 'role_id', 'user_id']);
  });
});
