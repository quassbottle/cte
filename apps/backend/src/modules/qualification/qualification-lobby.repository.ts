import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { QualificationLobbyId } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  qualificationLobbies,
  qualificationLobbyPlayers,
  qualificationLobbyTeams,
  Schema,
  teamParticipants,
} from 'lib/infrastructure/db';

const CAPACITY = 16;

@Injectable()
export class QualificationLobbyRepository {
  constructor(@Inject('DB') private readonly db: Schema) {}

  public selectSolo(input: {
    lobbyId: QualificationLobbyId;
    stageId: StageId;
    userId: UserId;
  }) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${qualificationLobbies} where ${qualificationLobbies.id} = ${input.lobbyId} for update`,
      );
      await tx
        .delete(qualificationLobbyPlayers)
        .where(
          and(
            eq(qualificationLobbyPlayers.stageId, input.stageId),
            eq(qualificationLobbyPlayers.userId, input.userId),
          ),
        );
      await this.assertCapacity(tx as Schema, input.lobbyId, 1);
      await tx.insert(qualificationLobbyPlayers).values(input);
    });
  }

  public selectTeam(input: {
    lobbyId: QualificationLobbyId;
    stageId: StageId;
    teamId: TeamId;
    seats: number;
  }) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${qualificationLobbies} where ${qualificationLobbies.id} = ${input.lobbyId} for update`,
      );
      await tx
        .delete(qualificationLobbyTeams)
        .where(
          and(
            eq(qualificationLobbyTeams.stageId, input.stageId),
            eq(qualificationLobbyTeams.teamId, input.teamId),
          ),
        );
      await this.assertCapacity(tx as Schema, input.lobbyId, input.seats);
      await tx.insert(qualificationLobbyTeams).values({
        lobbyId: input.lobbyId,
        stageId: input.stageId,
        teamId: input.teamId,
      });
    });
  }

  private async assertCapacity(
    db: Schema,
    lobbyId: QualificationLobbyId,
    needed: number,
  ) {
    const [players] = await db
      .select({ value: count() })
      .from(qualificationLobbyPlayers)
      .where(eq(qualificationLobbyPlayers.lobbyId, lobbyId));
    const selectedTeams = await db
      .select({ teamId: qualificationLobbyTeams.teamId })
      .from(qualificationLobbyTeams)
      .where(eq(qualificationLobbyTeams.lobbyId, lobbyId));
    const [members] = selectedTeams.length
      ? await db
          .select({ value: count() })
          .from(teamParticipants)
          .where(
            and(
              inArray(
                teamParticipants.teamId,
                selectedTeams.map(({ teamId }) => teamId),
              ),
              eq(teamParticipants.withdrawn, false),
            ),
          )
      : [{ value: 0 }];
    if ((players?.value ?? 0) + (members?.value ?? 0) + needed > CAPACITY) {
      throw new BadRequestException('Qualification lobby is full');
    }
  }
}
