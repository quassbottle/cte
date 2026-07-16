import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { qualificationLobbyIdSchema } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import { ZodResponse } from 'nestjs-zod';
import {
  QualificationLobbyDto,
  QualificationLobbyUpsertDto,
  SelectQualificationLobbyTeamDto,
} from './dto';
import { QualificationLobbyService } from './qualification-lobby.service';

@Controller('tournaments/:id/qualification-lobbies')
export class QualificationLobbyController {
  constructor(private readonly service: QualificationLobbyService) {}

  @Get()
  @ZodResponse({ status: 200, type: [QualificationLobbyDto] })
  public findByTournament(
    @Param('id', TournamentIdPipe) tournamentId: TournamentId,
  ) {
    return this.service.findByTournament(tournamentId);
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
