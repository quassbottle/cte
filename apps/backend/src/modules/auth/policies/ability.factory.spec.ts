import { AppAbilityFactory } from './ability.factory';

describe('AppAbilityFactory', () => {
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
