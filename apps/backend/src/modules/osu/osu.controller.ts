import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { OsuBeatmapMetadataDto, osuBeatmapMetadataDtoSchema } from './dto';
import { OsuBeatmapService } from './osu.service';

@Controller('osu')
export class OsuController {
  constructor(private readonly osuBeatmapService: OsuBeatmapService) {}

  @Get('beatmaps/:beatmapId')
  @ApiResponse({
    status: 200,
    description: 'Returns beatmap metadata from osu API with local sync.',
    type: OsuBeatmapMetadataDto.Output,
  })
  public async getBeatmapMetadata(
    @Param('beatmapId', ParseIntPipe) beatmapId: number,
  ): Promise<OsuBeatmapMetadataDto> {
    const metadata = await this.osuBeatmapService.getBeatmapMetadata({
      beatmapId,
    });

    return osuBeatmapMetadataDtoSchema.parse(metadata);
  }
}
