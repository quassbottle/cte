import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MatchSyncRepository } from './match-sync.repository';
import { MatchSyncService } from './match-sync.service';

@Injectable()
export class MatchSyncScheduler {
  private readonly logger = new Logger(MatchSyncScheduler.name);

  constructor(
    private readonly repository: MatchSyncRepository,
    private readonly service: MatchSyncService,
  ) {}

  @Interval(5_000)
  public async tick(): Promise<void> {
    const leases = await this.repository.claimDue();
    const results = await Promise.allSettled(
      leases.map((lease) => this.service.syncOnce(lease, true)),
    );
    for (const result of results) {
      if (result.status === 'rejected') this.logger.error(result.reason);
    }
  }
}
