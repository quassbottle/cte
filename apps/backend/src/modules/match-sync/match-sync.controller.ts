import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MatchIdPipe } from 'lib/common/pipes/match-id.pipe';
import { MatchId } from 'lib/domain/match/match.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import { MatchSyncRepository } from './match-sync.repository';
import { MatchSyncService } from './match-sync.service';

@Controller('matches')
@UseGuards(JwtUserGuard, PoliciesGuard)
export class MatchSyncController {
  constructor(
    private readonly repository: MatchSyncRepository,
    private readonly service: MatchSyncService,
  ) {}

  @Get(':matchId/sync')
  @CheckPolicies((ability, context) => ability.can('read', context.subjectData))
  public async get(@Param('matchId', MatchIdPipe) matchId: MatchId) {
    return this.repository.getState(matchId);
  }

  @Post(':matchId/sync')
  @CheckPolicies((ability, context) => ability.can('update', context.subjectData))
  public async sync(@Param('matchId', MatchIdPipe) matchId: MatchId) {
    await this.service.syncMatchOnce(matchId);
    return this.repository.getState(matchId);
  }

  @Delete(':matchId/sync')
  @CheckPolicies((ability, context) => ability.can('delete', context.subjectData))
  public async stop(@Param('matchId', MatchIdPipe) matchId: MatchId) {
    await this.repository.stop(matchId);
    return this.repository.getState(matchId);
  }
}
