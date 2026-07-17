import { Inject, Injectable } from '@nestjs/common';
import { eq, isNotNull } from 'drizzle-orm';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { StageId } from 'lib/domain/stage/stage.id';
import {
  osuMultiplayerRooms,
  qualificationLobbies,
  Schema,
} from 'lib/infrastructure/db';

@Injectable()
export class QualificationSyncRepository {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public async roomsByStage(): Promise<
    {
      stageId: StageId;
      roomId: OsuRoomId;
      status: 'active' | 'stopped' | 'completed';
      nextSyncAt: Date;
    }[]
  > {
    const rows = await this.db
      .select({
        stageId: qualificationLobbies.stageId,
        roomId: qualificationLobbies.osuRoomId,
        status: osuMultiplayerRooms.status,
        nextSyncAt: osuMultiplayerRooms.nextSyncAt,
      })
      .from(qualificationLobbies)
      .innerJoin(
        osuMultiplayerRooms,
        eq(osuMultiplayerRooms.id, qualificationLobbies.osuRoomId),
      )
      .where(isNotNull(qualificationLobbies.osuRoomId));
    return rows as {
      stageId: StageId;
      roomId: OsuRoomId;
      status: 'active' | 'stopped' | 'completed';
      nextSyncAt: Date;
    }[];
  }
}
