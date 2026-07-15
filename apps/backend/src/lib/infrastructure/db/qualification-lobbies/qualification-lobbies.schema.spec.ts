import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import {
  qualificationLobbies,
  qualificationLobbyPlayers,
  qualificationLobbyTeams,
  qualificationResults,
} from '../schema';

describe('qualification lobby schema', () => {
  it('keeps numbered lobbies unique within a stage', () => {
    const lobbies = getTableConfig(qualificationLobbies);

    expect(lobbies.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          config: expect.objectContaining({
            columns: expect.arrayContaining([
              expect.objectContaining({ name: 'stage_id' }),
              expect.objectContaining({ name: 'number' }),
            ]),
          }),
        }),
      ]),
    );
    expect(qualificationLobbies.osuRoomId.notNull).toBe(false);
    expect(qualificationLobbies.osuRoomId.isUnique).toBe(true);
  });

  it('assigns each participant to one lobby per qualification stage', () => {
    expect(
      getTableConfig(qualificationLobbyPlayers).primaryKeys[0]?.columns.map(
        (column) => column.name,
      ),
    ).toEqual(['lobby_id', 'user_id']);
    expect(
      getTableConfig(qualificationLobbyTeams).primaryKeys[0]?.columns.map(
        (column) => column.name,
      ),
    ).toEqual(['lobby_id', 'team_id']);

    for (const [participants, participantId] of [
      [qualificationLobbyPlayers, 'user_id'],
      [qualificationLobbyTeams, 'team_id'],
    ] as const) {
      expect(getTableConfig(participants).indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            config: expect.objectContaining({
              columns: expect.arrayContaining([
                expect.objectContaining({ name: 'stage_id' }),
                expect.objectContaining({ name: participantId }),
              ]),
              unique: true,
            }),
          }),
        ]),
      );

      expect(
        getTableConfig(participants).foreignKeys.map((foreignKey) => ({
          columns: foreignKey.reference().columns.map((column) => column.name),
          foreignColumns: foreignKey
            .reference()
            .foreignColumns.map((column) => column.name),
        })),
      ).toContainEqual({
        columns: ['lobby_id', 'stage_id'],
        foreignColumns: ['id', 'stage_id'],
      });
    }
  });

  it('stores one result per solo or team competitor', () => {
    expect(
      getTableConfig(qualificationResults).indexes.map((index) => ({
        columns: index.config.columns.map((column) =>
          'name' in column ? column.name : undefined,
        ),
        unique: index.config.unique,
        where: index.config.where,
      })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: ['stage_id', 'user_id'],
          unique: true,
          where: expect.anything(),
        }),
        expect.objectContaining({
          columns: ['stage_id', 'team_id'],
          unique: true,
          where: expect.anything(),
        }),
      ]),
    );
    const competitorCheck = getTableConfig(qualificationResults).checks.find(
      ({ name }) => name === 'qualification_results_competitor_check',
    );
    expect(competitorCheck).toBeDefined();
    expect(new PgDialect().sqlToQuery(competitorCheck!.value).sql).toContain(
      '("qualification_results"."user_id" IS NOT NULL) <> ("qualification_results"."team_id" IS NOT NULL)',
    );
  });
});
