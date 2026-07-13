import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { MappoolIdPipe } from 'lib/common/pipes/mappool-id.pipe';
import { TournamentIdPipe } from 'lib/common/pipes/tournament-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import { ZodResponse } from 'nestjs-zod';
import {
  AddMappoolBeatmapDto,
  CreateMappoolDto,
  MappoolBeatmapDto,
  MappoolDto,
  MappoolWithBeatmapsDto,
  UpdateMappoolBeatmapDto,
  UpdateMappoolDto,
} from './dto';
import { MappoolService } from './mappool.service';

@ApiBearerAuth('bearer')
@Controller('tournaments/:tournamentId/mappools')
export class TournamentMappoolController {
  constructor(private readonly mappoolService: MappoolService) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns visible tournament mappools with beatmaps.',
    type: [MappoolWithBeatmapsDto],
  })
  public async findByTournament(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
  ) {
    return this.mappoolService.findByTournamentWithBeatmaps({
      tournamentId,
      includeHidden: false,
    });
  }

  @Get('manage')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description:
      'Returns all tournament mappools with beatmaps for tournament creator.',
    type: [MappoolWithBeatmapsDto],
  })
  public async findByTournamentForManagement(
    @Param('tournamentId', TournamentIdPipe) tournamentId: TournamentId,
  ) {
    return this.mappoolService.findByTournamentWithBeatmaps({
      tournamentId,
      includeHidden: true,
    });
  }
}

@ApiBearerAuth('bearer')
@Controller('mappools')
export class MappoolController {
  constructor(private readonly mappoolService: MappoolService) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns mappools list.',
    type: [MappoolDto],
  })
  public async findMany(@Query() query: PaginationDto) {
    return this.mappoolService.findMany(query);
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns mappool by id.',
    type: MappoolDto,
  })
  public async getById(@Param('id', MappoolIdPipe) id: MappoolId) {
    return this.mappoolService.getById({ id });
  }

  @Get(':id/beatmaps')
  @ZodResponse({
    status: 200,
    description: 'Returns beatmaps in mappool.',
    type: [MappoolBeatmapDto],
  })
  public async findBeatmaps(@Param('id', MappoolIdPipe) id: MappoolId) {
    return this.mappoolService.findBeatmaps({ id });
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Creates a mappool.',
    type: MappoolDto,
  })
  public async create(@Body() body: CreateMappoolDto) {
    return this.mappoolService.create(body);
  }

  @Post(':id/beatmaps')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 201,
    description: 'Adds beatmap to mappool.',
    type: MappoolBeatmapDto,
  })
  public async addBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Body() body: AddMappoolBeatmapDto,
  ) {
    return this.mappoolService.addBeatmap({
      id,
      mod: body.mod,
      osuBeatmapsetId: body.beatmapsetId,
      osuBeatmapId: body.beatmapId,
    });
  }

  @Patch(':id/beatmaps/:osuBeatmapId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates mappool beatmap mod/index or replaces beatmap.',
    type: MappoolBeatmapDto,
  })
  public async updateBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Param('osuBeatmapId', ParseIntPipe) osuBeatmapId: number,
    @Body() body: UpdateMappoolBeatmapDto,
  ) {
    return this.mappoolService.updateBeatmap({
      id,
      osuBeatmapId,
      mod: body.mod,
      index: body.index,
      osuBeatmapsetId: body.beatmapsetId,
      nextOsuBeatmapId: body.beatmapId,
    });
  }

  @Delete(':id/beatmaps/:osuBeatmapId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Deletes beatmap from mappool.',
    type: MappoolBeatmapDto,
  })
  public async deleteBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Param('osuBeatmapId', ParseIntPipe) osuBeatmapId: number,
  ) {
    return this.mappoolService.deleteBeatmap({
      id,
      osuBeatmapId,
    });
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a mappool.',
    type: MappoolDto,
  })
  public async patch(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Body() body: UpdateMappoolDto,
  ) {
    return this.mappoolService.update({ id, data: body });
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ZodResponse({
    status: 200,
    description: 'Deletes a mappool.',
    type: MappoolDto,
  })
  public async delete(@Param('id', MappoolIdPipe) id: MappoolId) {
    return this.mappoolService.delete({ id });
  }
}
