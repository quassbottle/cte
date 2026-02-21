ALTER TABLE "solo_participants" DROP CONSTRAINT "solo_participants_match_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "solo_participants" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD COLUMN "tournament_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "captain_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "is_team" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD CONSTRAINT "solo_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_users_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solo_participants_match_id_idx" ON "solo_participants" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "solo_participants_tournament_id_idx" ON "solo_participants" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solo_participants_match_user_unique" ON "solo_participants" USING btree ("match_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solo_participants_tournament_user_unique" ON "solo_participants" USING btree ("tournament_id","user_id");