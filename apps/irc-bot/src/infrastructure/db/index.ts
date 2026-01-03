import { Config } from 'core/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Schema = NodePgDatabase<typeof schema>;

const pool = new Pool({
  connectionString: Config.databaseUrl,
});
export const db: Schema = drizzle(pool, { schema });

export type Database = typeof db;

export * from './schema';
