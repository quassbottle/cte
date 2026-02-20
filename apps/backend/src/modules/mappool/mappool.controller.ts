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
import { MappoolIdPipe } from 'lib/common/pipes/mappool-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import {
  AddMappoolBeatmapDto,
  CreateMappoolDto,
  MappoolDto,
  UpdateMappoolDto,
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
  public async findMany(
    @Query() query: PaginationDto,
  ): Promise<MappoolDto[]> {
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
  })
  public async addBeatmap(
    @Param('id', MappoolIdPipe) id: MappoolId,
    @Body() body: AddMappoolBeatmapDto,
  ): Promise<void> {
    await this.mappoolService.addBeatmap({ id, beatmapId: body.beatmapId });
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
