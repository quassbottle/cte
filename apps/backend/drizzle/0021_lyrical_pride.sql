CREATE TABLE "osu_multiplayer_games" (
	"room_id" text NOT NULL,
	"osu_game_id" bigint NOT NULL,
	"osu_beatmap_id" bigint NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osu_multiplayer_games_room_id_osu_game_id_pk" PRIMARY KEY("room_id","osu_game_id")
);
--> statement-breakpoint
CREATE TABLE "osu_multiplayer_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"osu_match_id" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"snapshot_hash" text,
	"next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"last_synced_at" timestamp with time zone,
	"last_data_changed_at" timestamp with time zone,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osu_multiplayer_rooms_osu_match_id_unique" UNIQUE("osu_match_id")
);
--> statement-breakpoint
CREATE TABLE "osu_multiplayer_scores" (
	"room_id" text NOT NULL,
	"osu_game_id" bigint NOT NULL,
	"osu_user_id" bigint NOT NULL,
	"osu_beatmap_id" bigint NOT NULL,
	"score" bigint NOT NULL,
	"team" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osu_multiplayer_scores_room_id_osu_game_id_osu_user_id_pk" PRIMARY KEY("room_id","osu_game_id","osu_user_id")
);
--> statement-breakpoint
CREATE TABLE "qualification_lobbies" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_id" text NOT NULL,
	"number" integer NOT NULL,
	"referee_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"mp_url" text,
	"osu_room_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_lobbies_osu_room_id_unique" UNIQUE("osu_room_id")
);
--> statement-breakpoint
CREATE TABLE "qualification_lobby_players" (
	"lobby_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_lobby_players_lobby_id_user_id_pk" PRIMARY KEY("lobby_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "qualification_lobby_teams" (
	"lobby_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_lobby_teams_lobby_id_team_id_pk" PRIMARY KEY("lobby_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "qualification_results" (
	"stage_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"seed" integer NOT NULL,
	"aggregate_score" bigint NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_results_competitor_check" CHECK (("qualification_results"."user_id" IS NOT NULL) <> ("qualification_results"."team_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "match_osu_sync" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qualification_attempts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "match_osu_sync" CASCADE;--> statement-breakpoint
DROP TABLE "qualification_attempts" CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "osu_room_id" text;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_games" ADD CONSTRAINT "osu_multiplayer_games_room_id_osu_multiplayer_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."osu_multiplayer_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD CONSTRAINT "osu_multiplayer_scores_room_id_osu_game_id_osu_multiplayer_games_room_id_osu_game_id_fk" FOREIGN KEY ("room_id","osu_game_id") REFERENCES "public"."osu_multiplayer_games"("room_id","osu_game_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobbies" ADD CONSTRAINT "qualification_lobbies_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobbies" ADD CONSTRAINT "qualification_lobbies_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobbies" ADD CONSTRAINT "qualification_lobbies_osu_room_id_osu_multiplayer_rooms_id_fk" FOREIGN KEY ("osu_room_id") REFERENCES "public"."osu_multiplayer_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_players" ADD CONSTRAINT "qualification_lobby_players_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_players" ADD CONSTRAINT "qualification_lobby_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_players" ADD CONSTRAINT "qualification_lobby_players_lobby_id_stage_id_qualification_lobbies_id_stage_id_fk" FOREIGN KEY ("lobby_id","stage_id") REFERENCES "public"."qualification_lobbies"("id","stage_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_teams" ADD CONSTRAINT "qualification_lobby_teams_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_teams" ADD CONSTRAINT "qualification_lobby_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_lobby_teams" ADD CONSTRAINT "qualification_lobby_teams_lobby_id_stage_id_qualification_lobbies_id_stage_id_fk" FOREIGN KEY ("lobby_id","stage_id") REFERENCES "public"."qualification_lobbies"("id","stage_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_results" ADD CONSTRAINT "qualification_results_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_results" ADD CONSTRAINT "qualification_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_results" ADD CONSTRAINT "qualification_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobbies_stage_number_unique" ON "qualification_lobbies" USING btree ("stage_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobbies_id_stage_unique" ON "qualification_lobbies" USING btree ("id","stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobby_players_stage_user_unique" ON "qualification_lobby_players" USING btree ("stage_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobby_teams_stage_team_unique" ON "qualification_lobby_teams" USING btree ("stage_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_results_stage_user_unique" ON "qualification_results" USING btree ("stage_id","user_id") WHERE "qualification_results"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_results_stage_team_unique" ON "qualification_results" USING btree ("stage_id","team_id") WHERE "qualification_results"."team_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_osu_room_id_osu_multiplayer_rooms_id_fk" FOREIGN KEY ("osu_room_id") REFERENCES "public"."osu_multiplayer_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "mp_url";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "red_score";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "blue_score";--> statement-breakpoint
ALTER TABLE "match_participants" DROP COLUMN "score";--> statement-breakpoint
ALTER TABLE "match_participants" DROP COLUMN "is_winner";--> statement-breakpoint
ALTER TABLE "solo_participants" DROP COLUMN "seed";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "seed";--> statement-breakpoint
ALTER TABLE "team_participants" DROP COLUMN "seed";--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_osu_room_id_unique" UNIQUE("osu_room_id");