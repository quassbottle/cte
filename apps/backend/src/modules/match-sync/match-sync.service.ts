import { ConflictException, Injectable } from '@nestjs/common';
import { MatchSyncRepository } from './match-sync.repository';
import { OsuMatchClient } from './osu-match.client';
import { calculateMatchPoints } from './score';
import { SyncLease } from './types';

@Injectable()
export class MatchSyncService {
  constructor(
    private readonly repository: MatchSyncRepository,
    private readonly client: OsuMatchClient,
  ) {}

  public async syncOnce(
    lease: SyncLease,
    background: boolean,
  ): Promise<boolean> {
    const input = await this.repository.loadInput(lease.matchId);
    const snapshot = await this.client.get(lease.osuMatchId);
    const points = calculateMatchPoints({
      snapshot,
      playerOsuIds: [input.players[0].osuId, input.players[1].osuId],
      allowedBeatmapIds: input.allowedBeatmapIds,
    });
    const written = await this.repository.applySuccess({
      lease,
      input,
      points,
      closedAt: snapshot.closedAt,
      background,
    });
    if (!written) throw new ConflictException('Match sync lease expired');
    return true;
  }

  public async syncMatchOnce(matchId: string): Promise<boolean> {
    const lease = await this.repository.claimOne(matchId);
    if (!lease) throw new ConflictException('Match sync is already running');
    return this.syncOnce(lease, false);
  }
}
