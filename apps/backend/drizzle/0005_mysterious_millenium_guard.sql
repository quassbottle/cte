DELETE FROM "osu_multiplayer_scores"
WHERE "mods" IS NULL OR "max_combo" IS NULL OR "accuracy" IS NULL OR "rank" IS NULL;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ALTER COLUMN "mods" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ALTER COLUMN "max_combo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ALTER COLUMN "accuracy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ALTER COLUMN "rank" SET NOT NULL;
