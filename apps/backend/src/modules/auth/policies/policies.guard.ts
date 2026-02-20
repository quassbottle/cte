import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  MappoolException,
  MappoolExceptionCode,
} from 'lib/domain/mappool/mappool.exception';
import { Reflector } from '@nestjs/core';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import { AppAbilityFactory } from './ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { MappoolPolicyContextResolver } from './resolvers/mappool-policy-context.resolver';
import { StagePolicyContextResolver } from './resolvers/stage-policy-context.resolver';
import { TournamentPolicyContextResolver } from './resolvers/tournament-policy-context.resolver';
import { PolicyContext, PolicyHandler, PolicyRequest } from './types';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AppAbilityFactory,
    private readonly mappoolResolver: MappoolPolicyContextResolver,
    private readonly stageResolver: StagePolicyContextResolver,
    private readonly tournamentResolver: TournamentPolicyContextResolver,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!handlers.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PolicyRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const ability = this.abilityFactory.createForUser(user);
    const policyContext = await this.resolvePolicyContext(request);
    const isAllowed = handlers.every((handler) =>
      handler(ability, policyContext),
    );

    if (!isAllowed) {
      this.throwAccessDenied(policyContext);
    }

    return true;
  }

  private async resolvePolicyContext(
    request: PolicyRequest,
  ): Promise<PolicyContext> {
    const resolvers = [
      this.mappoolResolver,
      this.stageResolver,
      this.tournamentResolver,
    ];
    const resolver = resolvers.find((candidate) => candidate.supports(request));

    if (!resolver) {
      throw new Error('No policy context resolver found for request');
    }

    return resolver.resolve(request);
  }

  private throwAccessDenied(context: PolicyContext): never {
    if (context.subject === 'Mappool') {
      throw new MappoolException(
        'Only tournament creator or admin can manage mappools',
        MappoolExceptionCode.MAPPOOL_ACCESS_DENIED,
      );
    }

    if (context.subject === 'Stage') {
      throw new StageException(
        'Only tournament creator or admin can manage stages',
        StageExceptionCode.STAGE_ACCESS_DENIED,
      );
    }

    throw new TournamentException(
      'Only admin can manage tournaments',
      TournamentExceptionCode.TOURNAMENT_ACCESS_DENIED,
    );
  }
}
