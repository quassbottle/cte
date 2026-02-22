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
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MappoolIdPipe } from 'lib/common/pipes/mappool-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import {
  AddMappoolBeatmapDto,
  CreateMappoolDto,
  MappoolBeatmapDto,
  MappoolDto,
  UpdateMappoolBeatmapDto,
  UpdateMappoolDto,
  mappoolBeatmapDtoSchema,
  mappoolDtoSchema,
} from './dto';
import { MappoolService } from './mappool.service';

@ApiBearerAuth('bearer')
@Controller('mappools')
export class MappoolController {
  constructor(private readonly mappoolService: MappoolService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns mappools list.',
    type: [MappoolDto.Output],
  })
  public async findMany(@Query() query: PaginationDto): Promise<MappoolDto[]> {
    const mappools = await this.mappoolService.findMany(query);

    return mappools.map((mappool) => mappoolDtoSchema.parse(mappool));
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns mappool by id.',
    type: MappoolDto.Output,
  })
  public async getById(
    @Param('id', MappoolIdPipe) id: MappoolId,
  ): Promise<MappoolDto> {
    const mappool = await this.mappoolService.getById({ id });

    return mappoolDtoSchema.parse(mappool);
  }

  @Get(':id/beatmaps')
  @ApiResponse({
    status: 200,
    description: 'Returns beatmaps in mappool.',
    type: [MappoolBeatmapDto.Output],
  })
  public async findBeatmaps(
    @Param('id', MappoolIdPipe) id: MappoolId,
  ): Promise<MappoolBeatmapDto[]> {
    const beatmaps = await this.mappoolService.findBeatmaps({ id });

    return beatmaps.map((beatmap) => mappoolBeatmapDtoSchema.parse(beatmap));
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ApiResponse({
    status: 201,
    description: 'Creates a mappool.',
    type: MappoolDto.Output,
  })
  public async create(@Body() body: CreateMappoolDto): Promise<MappoolDto> {
    const created = await this.mappoolService.create(body);

    return mappoolDtoSchema.parse(created);
  }

  @Post(':id/beatmaps')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 201,
    description: 'Adds beatmap to mappool.',
    type: MappoolBeatmapDto.Output,
  })
  public async addBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Body() body: AddMappoolBeatmapDto,
  ): Promise<MappoolBeatmapDto> {
    const created = await this.mappoolService.addBeatmap({
      id,
      mod: body.mod,
      osuBeatmapsetId: body.beatmapsetId,
      osuBeatmapId: body.beatmapId,
    });

    return mappoolBeatmapDtoSchema.parse(created);
  }

  @Patch(':id/beatmaps/:osuBeatmapId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Updates mappool beatmap mod and/or index.',
    type: MappoolBeatmapDto.Output,
  })
  public async updateBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Param('osuBeatmapId', ParseIntPipe) osuBeatmapId: number,
    @Body() body: UpdateMappoolBeatmapDto,
  ): Promise<MappoolBeatmapDto> {
    const updated = await this.mappoolService.updateBeatmap({
      id,
      osuBeatmapId,
      mod: body.mod,
      index: body.index,
    });

    return mappoolBeatmapDtoSchema.parse(updated);
  }

  @Delete(':id/beatmaps/:osuBeatmapId')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Deletes beatmap from mappool.',
    type: MappoolBeatmapDto.Output,
  })
  public async deleteBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Param('osuBeatmapId', ParseIntPipe) osuBeatmapId: number,
  ): Promise<MappoolBeatmapDto> {
    const deleted = await this.mappoolService.deleteBeatmap({
      id,
      osuBeatmapId,
    });

    return mappoolBeatmapDtoSchema.parse(deleted);
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Updates a mappool.',
    type: MappoolDto.Output,
  })
  public async patch(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Body() body: UpdateMappoolDto,
  ): Promise<MappoolDto> {
    const updated = await this.mappoolService.update({ id, data: body });

    return mappoolDtoSchema.parse(updated);
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Deletes a mappool.',
    type: MappoolDto.Output,
  })
  public async delete(
    @Param('id', MappoolIdPipe) id: MappoolId,
  ): Promise<MappoolDto> {
    const deleted = await this.mappoolService.delete({ id });

    return mappoolDtoSchema.parse(deleted);
  }
}
