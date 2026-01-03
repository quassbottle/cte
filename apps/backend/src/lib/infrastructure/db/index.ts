import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Schema = NodePgDatabase<typeof schema>;

export * from './schema';
