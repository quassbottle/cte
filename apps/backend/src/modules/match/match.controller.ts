import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { MatchIdPipe } from 'lib/common/pipes/match-id.pipe';
import { PaginationDto } from 'lib/common/utils/zod/pagination';
import { MatchId } from 'lib/domain/match/match.id';
import { UserDto, userDtoSchema } from 'modules/user/dto';
import { MatchDto } from './dto';
import { MatchService } from './match.service';

@Controller('matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns the match by ID.',
    type: MatchDto,
  })
  public async getById(
    @Param('id', MatchIdPipe) id: MatchId,
  ): Promise<MatchDto> {
    return this.matchService.getById({ id });
  }

  @Get(':id/participants')
  @ApiResponse({
    status: 200,
    description: 'Returns the participants of the match.',
    type: [UserDto],
  })
  public async getParticipants(
    @Param('id', MatchIdPipe) id: MatchId,
    @Query() query: PaginationDto,
  ): Promise<UserDto[]> {
    const participants = await this.matchService.getParticipants({
      matchId: id,
      ...query,
    });
    return participants.map((participant) => userDtoSchema.parse(participant));
  }
}
