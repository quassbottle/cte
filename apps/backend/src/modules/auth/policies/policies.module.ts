import { Module } from '@nestjs/common';
import { AppAbilityFactory } from './ability.factory';
import { PoliciesGuard } from './policies.guard';
import { MappoolPolicyContextResolver } from './resolvers/mappool-policy-context.resolver';
import { StagePolicyContextResolver } from './resolvers/stage-policy-context.resolver';
import { TournamentPolicyContextResolver } from './resolvers/tournament-policy-context.resolver';

@Module({
  providers: [
    AppAbilityFactory,
    PoliciesGuard,
    MappoolPolicyContextResolver,
    StagePolicyContextResolver,
    TournamentPolicyContextResolver,
  ],
  exports: [
    AppAbilityFactory,
    PoliciesGuard,
    MappoolPolicyContextResolver,
    StagePolicyContextResolver,
    TournamentPolicyContextResolver,
  ],
})
export class PoliciesModule {}
