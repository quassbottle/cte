import { sql } from 'drizzle-orm';
import { StageId } from 'lib/domain/stage/stage.id';
import { Schema, stages } from 'lib/infrastructure/db';

export const lockQualificationStage = (
  db: Pick<Schema, 'execute'>,
  stageId: StageId,
) =>
  db.execute(
    sql`select 1 from ${stages} where ${stages.id} = ${stageId} for update`,
  );
