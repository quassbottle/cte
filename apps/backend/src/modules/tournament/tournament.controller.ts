import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import {
  CreateTournamentDto,
  TournamentDto,
  UpdateTournamentDto,
  tournamentDtoSchema,
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
    type: [TournamentDto],
  })
  public async findMany(@Query() query: PaginationDto): Promise<TournamentDto[]> {
    const tournaments = await this.tournamentService.findMany(query);

    return tournaments.map((tournament) => tournamentDtoSchema.parse(tournament));
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns tournament by id.',
    type: TournamentDto,
  })
  public async getById(
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<TournamentDto> {
    const tournament = await this.tournamentService.getById({ id });

    return tournamentDtoSchema.parse(tournament);
  }

  @Post()
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 201,
    description: 'Creates a tournament.',
    type: TournamentDto,
  })
  public async create(
    @RequestUser() user: DbUser,
    @Body() body: CreateTournamentDto,
  ): Promise<TournamentDto> {
    this.assertAdmin(user);

    const created = await this.tournamentService.create({
      ...body,
      creatorId: user.id,
    });

    return tournamentDtoSchema.parse(created);
  }

  @Patch(':id')
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 200,
    description: 'Updates a tournament.',
    type: TournamentDto,
  })
  public async patch(
    @RequestUser() user: DbUser,
    @Param('id', TournamentIdPipe) id: TournamentId,
    @Body() body: UpdateTournamentDto,
  ): Promise<TournamentDto> {
    this.assertAdmin(user);

    const updated = await this.tournamentService.update({ id, data: body });

    return tournamentDtoSchema.parse(updated);
  }

  @Delete(':id')
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 200,
    description: 'Soft deletes a tournament.',
    type: TournamentDto,
  })
  public async softDelete(
    @RequestUser() user: DbUser,
    @Param('id', TournamentIdPipe) id: TournamentId,
  ): Promise<TournamentDto> {
    this.assertAdmin(user);

    const deleted = await this.tournamentService.softDelete({ id });

    return tournamentDtoSchema.parse(deleted);
  }

  private assertAdmin(user: DbUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admin can manage tournaments');
    }
  }
}
