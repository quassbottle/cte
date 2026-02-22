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
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import {
  CreateTournamentDto,
  RegisterTournamentDto,
  TournamentDto,
  TournamentParticipantDto,
  TournamentTeamDto,
  UpdateTournamentDto,
  tournamentDtoSchema,
  tournamentParticipantDtoSchema,
  tournamentTeamDtoSchema,
} from './dto';
import { TournamentService } from './tournament.service';

@ApiBearerAuth('bearer')
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns tournaments list.',
    type: [TournamentDto.Output],
  })
  public async findMany(
    @Query() query: PaginationDto,
  ): Promise<TournamentDto[]> {
    const tournaments = await this.tournamentService.findMany(query);

    return tournaments.map((tournament) =>
      tournamentDtoSchema.parse(tournament),
    );
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns tournament by id.',
    type: TournamentDto.Output,
  })
  public async getById(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<TournamentDto> {
    const tournament = await this.tournamentService.getById({ id });

    return tournamentDtoSchema.parse(tournament);
  }

  @Get(':id/participants')
  @ApiResponse({
    status: 200,
    description: 'Returns the participants of the tournament.',
    type: [TournamentParticipantDto.Output],
  })
  public async getParticipants(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Query() query: PaginationDto,
  ): Promise<TournamentParticipantDto[]> {
    const participants = await this.tournamentService.getParticipants({
      id,
      ...query,
    });

    return participants.map((participant) =>
      tournamentParticipantDtoSchema.parse(participant),
    );
  }

  @Get(':id/teams')
  @ApiResponse({
    status: 200,
    description: 'Returns teams of the tournament with participants.',
    type: [TournamentTeamDto.Output],
  })
  public async getTeams(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<TournamentTeamDto[]> {
    const teams = await this.tournamentService.getTeams({ id });

    return teams.map((team) =>
      tournamentTeamDtoSchema.parse({
        id: team.id,
        name: team.name,
        captainId: team.captainId,
        participants: team.participants.map((participant) =>
          tournamentParticipantDtoSchema.parse(participant),
        ),
      }),
    );
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ApiResponse({
    status: 201,
    description: 'Creates a tournament.',
    type: TournamentDto.Output,
  })
  public async create(
    @RequestUser() user: DbUser,
    @Body() body: CreateTournamentDto,
  ): Promise<TournamentDto> {
    const created = await this.tournamentService.create({
      ...body,
      creatorId: user.id,
    });

    return tournamentDtoSchema.parse(created);
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Updates a tournament.',
    type: TournamentDto.Output,
  })
  public async patch(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Body() body: UpdateTournamentDto,
  ): Promise<TournamentDto> {
    const updated = await this.tournamentService.update({ id, data: body });

    return tournamentDtoSchema.parse(updated);
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Soft deletes a tournament.',
    type: TournamentDto.Output,
  })
  public async softDelete(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<TournamentDto> {
    const deleted = await this.tournamentService.softDelete({ id });

    return tournamentDtoSchema.parse(deleted);
  }

  @Post(':id/register')
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 201,
    description: 'Registers current user to tournament.',
  })
  public async register(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @RequestUser() user: DbUser,
    @Body() body: RegisterTournamentDto = {} as RegisterTournamentDto,
  ): Promise<void> {
    await this.tournamentService.register({ id, userId: user.id, data: body });
  }

  @Delete(':id/register')
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 200,
    description: 'Unregisters current user or captain team from tournament.',
  })
  public async unregister(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @RequestUser() user: DbUser,
  ): Promise<void> {
    await this.tournamentService.unregister({ id, userId: user.id });
  }
}
