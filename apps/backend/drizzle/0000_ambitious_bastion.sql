CREATE TABLE "beatmaps" (
	"id" text PRIMARY KEY NOT NULL,
	"osu_beatmapset_id" bigint NOT NULL,
	"osu_beatmap_id" bigint NOT NULL,
	"artist" text NOT NULL,
	"title" text NOT NULL,
	"mode" text DEFAULT 'osu' NOT NULL,
	"difficulty_name" text NOT NULL,
	"difficulty" double precision DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mappools" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mappools_beatmaps" (
	"mappool_id" text NOT NULL,
	"beatmap_id" text NOT NULL,
	"mod" text NOT NULL,
	"index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mappools_beatmaps_mappool_id_beatmap_id_pk" PRIMARY KEY("mappool_id","beatmap_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stage_id" text,
	"match_number" integer,
	"creator_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"osu_room_id" text,
	"vod_url" text,
	"red_team_id" text,
	"blue_team_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matches_osu_room_id_unique" UNIQUE("osu_room_id"),
	CONSTRAINT "matches_distinct_teams_check" CHECK ("matches"."red_team_id" IS NULL OR "matches"."blue_team_id" IS NULL OR "matches"."red_team_id" <> "matches"."blue_team_id")
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"match_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_participants_match_id_user_id_pk" PRIMARY KEY("match_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "match_staff" (
	"match_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_staff_match_id_user_id_role_pk" PRIMARY KEY("match_id","user_id","role")
);
--> statement-breakpoint
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
CREATE TABLE "osu_stats" (
	"user_id" text NOT NULL,
	"osu_id" integer NOT NULL,
	"performance_points" real,
	"rank" integer,
	"mode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osu_stats_user_id_mode_pk" PRIMARY KEY("user_id","mode")
);
--> statement-breakpoint
CREATE TABLE "solo_participants" (
	"tournament_id" text NOT NULL,
	"user_id" text NOT NULL,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawal_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solo_participants_tournament_id_user_id_pk" PRIMARY KEY("tournament_id","user_id")
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
	CONSTRAINT "qualification_lobbies_osu_room_id_unique" UNIQUE("osu_room_id"),
	CONSTRAINT "qualification_lobbies_id_stage_unique" UNIQUE("id","stage_id")
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
CREATE TABLE "staff_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"can_participate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'regular' NOT NULL,
	"tournament_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"captain_id" text NOT NULL,
	"tournament_id" text NOT NULL,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawal_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_participants" (
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawal_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_participants_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rules" text,
	"mode" text DEFAULT 'osu' NOT NULL,
	"is_team" boolean DEFAULT false NOT NULL,
	"registration_open" boolean DEFAULT true NOT NULL,
	"creator_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_staff_members" (
	"tournament_id" text NOT NULL,
	"role_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_staff_members_tournament_id_role_id_user_id_pk" PRIMARY KEY("tournament_id","role_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"osu_id" integer NOT NULL,
	"osu_username" text NOT NULL,
	"country_code" text,
	"osu_cover_url" text,
	"default_mode" text DEFAULT 'osu' NOT NULL,
	"role" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_osu_id_unique" UNIQUE("osu_id")
);
--> statement-breakpoint
ALTER TABLE "mappools" ADD CONSTRAINT "mappools_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mappools_beatmaps" ADD CONSTRAINT "mappools_beatmaps_mappool_id_mappools_id_fk" FOREIGN KEY ("mappool_id") REFERENCES "public"."mappools"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mappools_beatmaps" ADD CONSTRAINT "mappools_beatmaps_beatmap_id_beatmaps_id_fk" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_osu_room_id_osu_multiplayer_rooms_id_fk" FOREIGN KEY ("osu_room_id") REFERENCES "public"."osu_multiplayer_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_red_team_id_teams_id_fk" FOREIGN KEY ("red_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_blue_team_id_teams_id_fk" FOREIGN KEY ("blue_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_staff" ADD CONSTRAINT "match_staff_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_staff" ADD CONSTRAINT "match_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_games" ADD CONSTRAINT "osu_multiplayer_games_room_id_osu_multiplayer_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."osu_multiplayer_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osu_multiplayer_scores" ADD CONSTRAINT "osu_multiplayer_scores_room_id_osu_game_id_osu_multiplayer_games_room_id_osu_game_id_fk" FOREIGN KEY ("room_id","osu_game_id") REFERENCES "public"."osu_multiplayer_games"("room_id","osu_game_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osu_stats" ADD CONSTRAINT "osu_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD CONSTRAINT "solo_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD CONSTRAINT "solo_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "stages" ADD CONSTRAINT "stages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_users_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_role_id_staff_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."staff_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beatmaps_osu_beatmap_id_unique" ON "beatmaps" USING btree ("osu_beatmap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mappools_stage_id_unique" ON "mappools" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mappools_beatmaps_mappool_id_mod_index_unique" ON "mappools_beatmaps" USING btree ("mappool_id","mod","index");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobbies_stage_number_unique" ON "qualification_lobbies" USING btree ("stage_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobby_players_stage_user_unique" ON "qualification_lobby_players" USING btree ("stage_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_lobby_teams_stage_team_unique" ON "qualification_lobby_teams" USING btree ("stage_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_results_stage_user_unique" ON "qualification_results" USING btree ("stage_id","user_id") WHERE "qualification_results"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_results_stage_team_unique" ON "qualification_results" USING btree ("stage_id","team_id") WHERE "qualification_results"."team_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stages_one_qualification_per_tournament" ON "stages" USING btree ("tournament_id") WHERE "stages"."deleted_at" IS NULL AND "stages"."type" = 'qualification';--> statement-breakpoint
INSERT INTO "staff_roles" ("id", "name", "can_participate") VALUES
  ('ckm123456789012345678901', 'Host', false),
  ('ckm123456789012345678902', 'Referee', false),
  ('ckm123456789012345678903', 'Mapper', false),
  ('ckm123456789012345678904', 'Commentator', true),
  ('ckm123456789012345678905', 'Streamer', true),
  ('ckm123456789012345678906', 'Playtester', false);
