import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  matches,
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
} from '../schema';

describe('osu multiplayer schema', () => {
  it('stores rooms by osu match id and links matches to rooms', () => {
    expect(osuMultiplayerRooms.osuMatchId).toBeDefined();
    expect(matches.osuRoomId).toBeDefined();
    expect(matches.osuRoomId.notNull).toBe(false);
    expect(matches.osuRoomId.isUnique).toBe(true);
    expect(
      getTableConfig(matches).foreignKeys.map(
        (foreignKey) => foreignKey.reference().foreignTable,
      ),
    ).toContain(osuMultiplayerRooms);
  });

  it('keys games and scores by their upstream osu ids', () => {
    expect(
      getTableConfig(osuMultiplayerGames).primaryKeys[0]?.columns.map(
        (column) => column.name,
      ),
    ).toEqual(['room_id', 'osu_game_id']);
    expect(
      getTableConfig(osuMultiplayerScores).primaryKeys[0]?.columns.map(
        (column) => column.name,
      ),
    ).toEqual(['room_id', 'osu_game_id', 'osu_user_id']);
    expect(osuMultiplayerScores.osuBeatmapId).toBeDefined();
  });

  it('relates scores to games with their composite key', () => {
    expect(
      getTableConfig(osuMultiplayerScores).foreignKeys.map((foreignKey) => ({
        columns: foreignKey.reference().columns.map((column) => column.name),
        foreignColumns: foreignKey
          .reference()
          .foreignColumns.map((column) => column.name),
      })),
    ).toContainEqual({
      columns: ['room_id', 'osu_game_id'],
      foreignColumns: ['room_id', 'osu_game_id'],
    });
  });
});
