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
import { ApiBearerAuth } from '@nestjs/swagger';
import { StageIdPipe } from 'lib/common/pipes/stage-id.pipe';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import { ZodResponse } from 'nestjs-zod';
import { CreateStageDto, StageDto, UpdateStageDto } from './dto';
import { StageService } from './stage.service';

@ApiBearerAuth('bearer')
@Controller('tournaments/:tournamentId/stages')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns stages list for tournament.',
    type: [StageDto],
  })
  public async findMany(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
  ) {
    return this.stageService.findByTournament({ tournamentId });
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns stage by id.',
    type: StageDto,
  })
  public async getById(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
    @Param('id', StageIdPipe) id: StageId,
  ) {
    return this.stageService.getById({ id, tournamentId });
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Creates a stage.',
    type: StageDto,
  })
  public async create(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
    @Body() body: CreateStageDto,
  ) {
    return this.stageService.create({ ...body, tournamentId });
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a stage.',
    type: StageDto,
  })
  public async patch(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
    @Param('id', StageIdPipe) id: StageId,
    @Body() body: UpdateStageDto,
  ) {
    return this.stageService.update({
      id,
      tournamentId,
      data: body,
    });
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Soft deletes a stage.',
    type: StageDto,
  })
  public async softDelete(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
    @Param('id', StageIdPipe) id: StageId,
  ) {
    return this.stageService.softDelete({ id, tournamentId });
  }
}
