ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "mods" text[];--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "max_combo" integer;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "accuracy" double precision;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "rank" text;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "great" integer;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "ok" integer;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD COLUMN "miss" integer;