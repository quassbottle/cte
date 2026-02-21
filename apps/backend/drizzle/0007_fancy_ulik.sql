ALTER TABLE "beatmaps" ADD COLUMN "osu_beatmapset_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "artist" text NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "difficulty_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "difficulty" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mappools_beatmaps" ADD COLUMN "mod" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mappools_beatmaps" ADD COLUMN "index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "mode" text DEFAULT 'osu' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "beatmaps_osu_beatmap_id_unique" ON "beatmaps" USING btree ("osu_beatmap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mappools_beatmaps_mappool_id_mod_index_unique" ON "mappools_beatmaps" USING btree ("mappool_id","mod","index");