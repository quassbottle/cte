import type { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';

export type RoomSyncStatus = 'active' | 'stopped' | 'completed';

export type OsuRoomLease = {
  roomId: OsuRoomId;
  osuMatchId: number;
  leaseToken: string;
  status: RoomSyncStatus;
};

export type OsuMatchScore = {
  userId: number;
  score: number;
  team: 'red' | 'blue' | null;
  mods: string[];
  maxCombo: number;
  accuracy: number;
  rank: string;
  great: number;
  ok: number;
  miss: number;
};

export type OsuMatchGame = {
  id: number;
  beatmapId: number;
  endedAt: Date | null;
  scores: OsuMatchScore[];
};

export type OsuMatchSnapshot = {
  closedAt: Date | null;
  games: OsuMatchGame[];
};
