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
import { StageIdPipe } from 'lib/common/pipes/stage-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { StageId } from 'lib/domain/stage/stage.id';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { CheckPolicies } from 'modules/auth/policies/check-policies.decorator';
import { PoliciesGuard } from 'modules/auth/policies/policies.guard';
import {
  CreateStageDto,
  StageDto,
  UpdateStageDto,
  stageDtoSchema,
} from './dto';
import { StageService } from './stage.service';

@ApiBearerAuth('bearer')
@Controller('stages')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns stages list.',
    type: [StageDto.Output],
  })
  public async findMany(@Query() query: PaginationDto): Promise<StageDto[]> {
    const stages = await this.stageService.findMany(query);

    return stages.map((stage) => stageDtoSchema.parse(stage));
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns stage by id.',
    type: StageDto.Output,
  })
  public async getById(
    @Param('id', StageIdPipe) id: StageId,
  ): Promise<StageDto> {
    const stage = await this.stageService.getById({ id });

    return stageDtoSchema.parse(stage);
  }

  @Post()
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('create', context.subjectData),
  )
  @ApiResponse({
    status: 201,
    description: 'Creates a stage.',
    type: StageDto.Output,
  })
  public async create(@Body() body: CreateStageDto): Promise<StageDto> {
    const created = await this.stageService.create(body);

    return stageDtoSchema.parse(created);
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('update', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Updates a stage.',
    type: StageDto.Output,
  })
  public async patch(
    @Param('id', StageIdPipe) id: StageId,
    @Body() body: UpdateStageDto,
  ): Promise<StageDto> {
    const updated = await this.stageService.update({ id, data: body });

    return stageDtoSchema.parse(updated);
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard, PoliciesGuard)
  @CheckPolicies((ability, context) =>
    ability.can('delete', context.subjectData),
  )
  @ApiResponse({
    status: 200,
    description: 'Soft deletes a stage.',
    type: StageDto.Output,
  })
  public async softDelete(
    @Param('id', StageIdPipe) id: StageId,
  ): Promise<StageDto> {
    const deleted = await this.stageService.softDelete({ id });

    return stageDtoSchema.parse(deleted);
  }
}
