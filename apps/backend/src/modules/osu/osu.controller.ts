import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { OsuBeatmapMetadataDto } from './dto';
import { OsuBeatmapService } from './osu.service';

@Controller('osu')
export class OsuController {
  constructor(private readonly osuBeatmapService: OsuBeatmapService) {}

  @Get('beatmaps/:beatmapId')
  @ZodResponse({
    status: 200,
    description: 'Returns beatmap metadata from osu API with local sync.',
    type: OsuBeatmapMetadataDto,
  })
  public async getBeatmapMetadata(
    @Param('beatmapId', ParseIntPipe) beatmapId: number,
  ): Promise<OsuBeatmapMetadataDto> {
    return this.osuBeatmapService.getBeatmapMetadata({
      beatmapId,
    });
  }
}
