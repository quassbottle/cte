import { Injectable } from '@nestjs/common';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { parseOsuMatchId } from './mp-url';
import { OsuMatchClient } from './osu-match.client';
import { OsuMultiplayerSyncRepository } from './osu-multiplayer-sync.repository';

@Injectable()
export class OsuMultiplayerSyncService {
  constructor(
    private readonly repository: OsuMultiplayerSyncRepository,
    private readonly client: OsuMatchClient,
  ) {}

  public async ensureRoom(mpUrl: string): Promise<OsuRoomId> {
    const osuMatchId = parseOsuMatchId(mpUrl);
    if (!osuMatchId) throw new Error('Invalid osu multiplayer URL');
    return this.repository.ensureRoom(osuMatchId);
  }

  public async sync(roomId: OsuRoomId, force = false) {
    const lease = await this.repository.claim(roomId, force);
    if (!lease) return { changed: false, status: 'active' as const };
    try {
      const snapshot = await this.client.get(lease.osuMatchId);
      return await this.repository.applySnapshot(lease, snapshot);
    } catch (error) {
      await this.repository.applyFailure(lease, error);
      throw error;
    }
  }

  public stop(roomId: OsuRoomId): Promise<void> {
    return this.repository.stop(roomId);
  }
}
