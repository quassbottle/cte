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
import { MatchIdPipe } from 'lib/common/pipes/match-id.pipe';
import { TeamIdPipe } from 'lib/common/pipes/team-id.pipe';
import { StaffRoleIdPipe } from 'lib/common/pipes/staff-role-id.pipe';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { UserIdPipe } from 'lib/common/pipes/user-id.pipe';
import { MatchId } from 'lib/domain/match/match.id';
import { TeamId } from 'lib/domain/team/team.id';
import { StaffRoleId } from 'lib/domain/staff-role/staff-role.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import {
  MatchDto,
  type MatchDtoOutput,
  ScheduleMatchUpsertDto,
  StageScheduleDto,
} from 'modules/match/dto';
import { MatchService } from 'modules/match/match.service';
import { ScheduleService } from 'modules/match/schedule.service';
import { ZodResponse } from 'nestjs-zod';
import {
  CreateTournamentDto,
  FindTournamentParticipantsDto,
  FindTournamentTeamsDto,
  FindTournamentsDto,
  QualificationRosterDto,
  type QualificationRosterInput,
  RegisterTournamentDto,
  AssignTournamentStaffDto,
  TournamentDto,
  TournamentParticipantDto,
  TournamentTeamDto,
  TournamentStaffRoleDto,
  TournamentTeamSummaryDto,
  UpdateQualificationCompetitorDto,
  UpdateQualificationTeamParticipantDto,
  UpdateTournamentDto,
} from './dto';
import { TournamentService } from './tournament.service';

@ApiBearerAuth('bearer')
@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly matchService: MatchService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns tournaments list.',
    type: [TournamentDto],
  })
  public async findMany(@Query() query: FindTournamentsDto) {
    const tournaments = await this.tournamentService.findMany(query);
    const participantsCountByTournamentId =
      await this.tournamentService.getParticipantsCountMap(
        tournaments.map((tournament) => tournament.id),
      );

    return tournaments.map((tournament) => ({
      ...tournament,
      participantsCount:
        participantsCountByTournamentId.get(tournament.id) ?? 0,
    }));
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns tournament by id.',
    type: TournamentDto,
  })
  public async getById(@Param('id', TournamentIdPipe) id: TournamentId) {
    const tournament = await this.tournamentService.getById({ id });
    const participantsCount = await this.tournamentService.getParticipantsCount(
      { id, isTeam: tournament.isTeam },
    );

    return { ...tournament, participantsCount };
  }

  @Get(':id/participants')
  @ZodResponse({
    status: 200,
    description: 'Returns the participants of the tournament.',
    type: [TournamentParticipantDto],
  })
  public async getParticipants(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Query() query: FindTournamentParticipantsDto,
  ) {
    return this.tournamentService.getParticipants({
      id,
      ...query,
    });
  }

  @Get(':id/participants/manage')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Returns the managed roster.',
    type: QualificationRosterDto,
  })
  public async getQualificationRoster(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<QualificationRosterInput> {
    return this.tournamentService.getQualificationRoster({ id });
  }

  @Patch(':id/participants/:userId/manage')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a solo qualification participant.',
    type: QualificationRosterDto,
  })
  public async updateSoloQualificationParticipant(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Param('userId', UserIdPipe) userId: UserId,
    @Body() body: UpdateQualificationCompetitorDto,
  ): Promise<QualificationRosterInput> {
    await this.tournamentService.updateSoloQualificationParticipant({
      id,
      userId,
      data: body,
    });
    return this.tournamentService.getQualificationRoster({ id });
  }

  @Patch(':id/teams/:teamId/manage')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a qualification team.',
    type: QualificationRosterDto,
  })
  public async updateQualificationTeam(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Param('teamId', TeamIdPipe) teamId: TeamId,
    @Body() body: UpdateQualificationCompetitorDto,
  ): Promise<QualificationRosterInput> {
    await this.tournamentService.updateQualificationTeam({
      id,
      teamId,
      data: body,
    });
    return this.tournamentService.getQualificationRoster({ id });
  }

  @Patch(':id/teams/:teamId/participants/:userId/manage')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a qualification team participant.',
    type: QualificationRosterDto,
  })
  public async updateQualificationTeamParticipant(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Param('teamId', TeamIdPipe) teamId: TeamId,
    @Param('userId', UserIdPipe) userId: UserId,
    @Body() body: UpdateQualificationTeamParticipantDto,
  ): Promise<QualificationRosterInput> {
    await this.tournamentService.updateQualificationTeamParticipant({
      id,
      teamId,
      userId,
      data: body,
    });
    return this.tournamentService.getQualificationRoster({ id });
  }

  @Post(':id/qualification/calculate-seeds')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Recalculates qualification seeds.',
    type: QualificationRosterDto,
  })
  public async calculateQualificationSeeds(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<QualificationRosterInput> {
    return this.tournamentService.calculateQualificationSeeds({ id });
  }

  @Get(':id/teams/search')
  @ZodResponse({
    status: 200,
    description: 'Searches tournament teams.',
    type: [TournamentTeamSummaryDto],
  })
  public async searchTeams(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Query() query: FindTournamentTeamsDto,
  ) {
    return this.tournamentService.searchTeams({ id, ...query });
  }

  @Get(':id/teams')
  @ZodResponse({
    status: 200,
    description: 'Returns teams of the tournament with participants.',
    type: [TournamentTeamDto],
  })
  public async getTeams(@Param('id', TournamentIdPipe) id: TournamentId) {
    const teams = await this.tournamentService.getTeams({ id });

    return teams;
  }

  @Get(':id/staff')
  @ZodResponse({ status: 200, description: 'Returns tournament staff.', type: [TournamentStaffRoleDto] })
  public async getStaff(@Param('id', TournamentIdPipe) id: TournamentId) {
    return this.tournamentService.getStaff({ id });
  }

  @Post(':id/staff')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) => ability.can('update', context.subjectData))
  @ZodResponse({ status: 201, description: 'Assigns tournament staff.', type: [TournamentStaffRoleDto] })
  public async assignStaff(@Param('id', TournamentIdPipe) id: TournamentId, @Body() body: AssignTournamentStaffDto) {
    await this.tournamentService.assignStaff({ id, ...body });
    return this.tournamentService.getStaff({ id });
  }

  @Delete(':id/staff/:roleId/:userId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) => ability.can('update', context.subjectData))
  @ZodResponse({ status: 200, description: 'Removes tournament staff.', type: [TournamentStaffRoleDto] })
  public async removeStaff(@Param('id', TournamentIdPipe) id: TournamentId, @Param('roleId', StaffRoleIdPipe) roleId: StaffRoleId, @Param('userId', UserIdPipe) userId: UserId) {
    await this.tournamentService.removeStaff({ id, roleId, userId });
    return this.tournamentService.getStaff({ id });
  }

  @Get(':id/matches')
  @ZodResponse({
    status: 200,
    description: 'Returns tournament schedule grouped by stages.',
    type: [StageScheduleDto],
  })
  public async getSchedule(@Param('id', TournamentIdPipe) id: TournamentId) {
    return this.scheduleService.findByTournament({
      tournamentId: id,
    });
  }

  @Post(':id/matches')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Creates a schedule match.',
    type: MatchDto,
  })
  public async createMatch(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @RequestUser() user: DbUser,
    @Body() body: ScheduleMatchUpsertDto,
  ): Promise<MatchDtoOutput> {
    return this.matchService.createScheduleMatch({
      tournamentId: id,
      data: { ...body, creatorId: user.id },
    });
  }

  @Patch(':id/matches/:matchId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a schedule match.',
    type: MatchDto,
  })
  public async updateMatch(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Param('matchId', MatchIdPipe) matchId: MatchId,
    @Body() body: ScheduleMatchUpsertDto,
  ): Promise<MatchDtoOutput> {
    return this.matchService.updateScheduleMatch({
      tournamentId: id,
      matchId,
      data: body,
    });
  }

  @Delete(':id/matches/:matchId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Deletes a schedule match.',
    type: MatchDto,
  })
  public async deleteMatch(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Param('matchId', MatchIdPipe) matchId: MatchId,
  ): Promise<MatchDtoOutput> {
    return this.matchService.deleteScheduleMatch({
      tournamentId: id,
      matchId,
    });
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Creates a tournament.',
    type: TournamentDto,
  })
  public async create(
    @RequestUser() user: DbUser,
    @Body() body: CreateTournamentDto,
  ) {
    const created = await this.tournamentService.create({
      ...body,
      creatorId: user.id,
    });

    return { ...created, participantsCount: 0 };
  }

  @Patch(':id/archive')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Archives a tournament.',
    type: TournamentDto,
  })
  public async archive(@Param('id', TournamentIdPipe) id: TournamentId) {
    const archived = await this.tournamentService.archive({ id });
    const participantsCount = await this.tournamentService.getParticipantsCount(
      { id, isTeam: archived.isTeam },
    );

    return { ...archived, participantsCount };
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a tournament.',
    type: TournamentDto,
  })
  public async patch(
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Body() body: UpdateTournamentDto,
  ) {
    const updated = await this.tournamentService.update({ id, data: body });
    const participantsCount = await this.tournamentService.getParticipantsCount(
      { id, isTeam: updated.isTeam },
    );

    return { ...updated, participantsCount };
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Soft deletes a tournament.',
    type: TournamentDto,
  })
  public async softDelete(@Param('id', TournamentIdPipe) id: TournamentId) {
    const deleted = await this.tournamentService.softDelete({ id });
    const participantsCount = await this.tournamentService.getParticipantsCount(
      { id, isTeam: deleted.isTeam },
    );

    return { ...deleted, participantsCount };
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
