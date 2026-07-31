import { AppAbilityFactory } from './ability.factory';

describe('AppAbilityFactory', () => {
  it('does not allow a tournament creator to delete a tournament', () => {
    const ability = new AppAbilityFactory().createForUser({
      id: 'creator-id',
      role: 'default',
    } as never);
    const tournament = {
      __type: 'Tournament',
      creatorId: 'creator-id',
    } as never;

    expect(ability.can('update', tournament)).toBe(true);
    expect(ability.can('delete', tournament)).toBe(false);
  });

  it('allows admins to manage resources owned by another tournament host', () => {
    const ability = new AppAbilityFactory().createForUser({
      id: 'admin-id',
      role: 'admin',
    } as never);

    expect(
      [
        { __type: 'Tournament', creatorId: 'owner-id' },
        { __type: 'Stage', tournamentCreatorId: 'owner-id' },
        { __type: 'Match', tournamentCreatorId: 'owner-id' },
        { __type: 'Mappool', tournamentCreatorId: 'owner-id' },
      ].every((subject) => ability.can('manage', subject as never)),
    ).toBe(true);
  });
});
