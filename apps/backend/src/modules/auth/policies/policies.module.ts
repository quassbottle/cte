import { Module } from '@nestjs/common';
import { AppAbilityFactory } from './ability.factory';
import { PoliciesGuard } from './policies.guard';
import { StagePolicyContextResolver } from './resolvers/stage-policy-context.resolver';
import { TournamentPolicyContextResolver } from './resolvers/tournament-policy-context.resolver';

@Module({
  providers: [
    AppAbilityFactory,
    PoliciesGuard,
    StagePolicyContextResolver,
    TournamentPolicyContextResolver,
  ],
  exports: [
    AppAbilityFactory,
    PoliciesGuard,
    StagePolicyContextResolver,
    TournamentPolicyContextResolver,
  ],
})
export class PoliciesModule {}
