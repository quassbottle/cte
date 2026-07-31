import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { qualificationLobbyIdSchema } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { OptionalJwtUserGuard } from 'modules/auth/guards/optional-jwt.guard';
import { TournamentVisibilityGuard } from 'modules/auth/guards/tournament-visibility.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import { ZodResponse } from 'nestjs-zod';
import {
  QualificationLobbyDto,
  QualificationLobbyHistoryDto,
  QualificationLobbyUpsertDto,
  QualificationStatisticsDto,
  QualificationStatisticsQueryDto,
  SelectQualificationLobbyTeamDto,
} from './dto';
import { QualificationLobbyService } from './qualification-lobby.service';
import { QualificationResultsService } from './qualification-results.service';

@Controller('tournaments/:id/qualification-results')
@UseGuards(OptionalJwtUserGuard, TournamentVisibilityGuard)
export class QualificationResultsController {
  constructor(private readonly service: QualificationResultsService) {}

  @Get()
  @ZodResponse({ status: 200, type: QualificationStatisticsDto })
  public find(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Query() query: QualificationStatisticsQueryDto,
  ) {
    return this.service.getStatistics(tournamentId, query);
  }
}

@Controller('tournaments/:id/qualification-lobbies')
@UseGuards(OptionalJwtUserGuard, TournamentVisibilityGuard)
export class QualificationLobbyController {
  constructor(private readonly service: QualificationLobbyService) {}

  @Get()
  @ZodResponse({ status: 200, type: [QualificationLobbyDto] })
  public findByTournament(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
  ) {
    return this.service.findByTournament(tournamentId);
  }

  @Get(':lobbyId/history')
  @ZodResponse({ status: 200, type: QualificationLobbyHistoryDto })
  public getHistory(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
  ) {
    return this.service.getHistory(
      tournamentId,
      qualificationLobbyIdSchema.parse(lobbyId),
    );
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  public create(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Body() body: QualificationLobbyUpsertDto,
  ) {
    return this.service.create({ tournamentId, ...body });
  }

  @Patch(':lobbyId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  public update(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
    @Body() body: QualificationLobbyUpsertDto,
  ) {
    return this.service.update({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
      ...body,
    });
  }

  @Delete(':lobbyId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  public delete(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
  ) {
    return this.service.delete({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
    });
  }

  @Post(':lobbyId/start')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  public start(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
  ) {
    return this.service.start({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
    });
  }

  @Delete(':lobbyId/start')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  public stop(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
  ) {
    return this.service.stop({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
    });
  }

  @Post(':lobbyId/solo')
  @UseGuards(JwtUserGuard)
  public selectSolo(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
    @RequestUser() user: DbUser,
  ) {
    return this.service.joinSolo({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
      userId: user.id,
    });
  }

  @Post(':lobbyId/team')
  @UseGuards(JwtUserGuard)
  public selectTeam(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
    @Param('lobbyId') lobbyId: string,
    @RequestUser() user: DbUser,
    @Body() body: SelectQualificationLobbyTeamDto,
  ) {
    return this.service.joinTeam({
      tournamentId,
      lobbyId: qualificationLobbyIdSchema.parse(lobbyId),
      teamId: body.teamId,
      userId: user.id,
    });
  }
}
