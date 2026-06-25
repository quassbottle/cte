ALTER TABLE "matches" ADD COLUMN "stage_id" text;
ALTER TABLE "matches" ADD COLUMN "match_number" integer;
ALTER TABLE "matches" ADD COLUMN "mp_url" text;
ALTER TABLE "matches" ADD COLUMN "vod_url" text;
ALTER TABLE "users" ADD COLUMN "country_code" text;
ALTER TABLE "solo_participants" ADD COLUMN "seed" integer;
ALTER TABLE "team_participants" ADD COLUMN "seed" integer;
CREATE TABLE "match_staff" (
	"match_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_staff_match_id_user_id_role_pk" PRIMARY KEY("match_id","user_id","role")
);
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "match_staff" ADD CONSTRAINT "match_staff_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "match_staff" ADD CONSTRAINT "match_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "match_staff_one_referee_per_match" ON "match_staff" ("match_id") WHERE "role" = 'referee';
CREATE UNIQUE INDEX "match_staff_one_streamer_per_match" ON "match_staff" ("match_id") WHERE "role" = 'streamer';
