CREATE TABLE "qualification_attempts" (
	"match_id" text NOT NULL,
	"osu_game_id" bigint NOT NULL,
	"beatmap_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_attempts_match_id_osu_game_id_user_id_pk" PRIMARY KEY("match_id","osu_game_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "solo_participants" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "type" text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "seed" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "team_participants" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_participants" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "qualification_attempts" ADD CONSTRAINT "qualification_attempts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_attempts" ADD CONSTRAINT "qualification_attempts_beatmap_id_beatmaps_id_fk" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "qualification_attempts" ADD CONSTRAINT "qualification_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "qualification_attempts_map_user_idx" ON "qualification_attempts" USING btree ("beatmap_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_one_qualification_per_tournament" ON "stages" USING btree ("tournament_id") WHERE "stages"."deleted_at" IS NULL AND "stages"."type" = 'qualification';