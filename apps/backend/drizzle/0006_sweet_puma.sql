ALTER TABLE "beatmaps" ADD COLUMN IF NOT EXISTS "difficulty" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "beatmaps" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 0 NOT NULL;
ALTER TABLE "beatmaps" ADD COLUMN IF NOT EXISTS "deleted" boolean DEFAULT false NOT NULL;
