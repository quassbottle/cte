ALTER TABLE "matches" ADD COLUMN "red_team_id" text;
ALTER TABLE "matches" ADD COLUMN "blue_team_id" text;
ALTER TABLE "matches" ADD COLUMN "red_score" integer;
ALTER TABLE "matches" ADD COLUMN "blue_score" integer;
ALTER TABLE "matches" ADD CONSTRAINT "matches_red_team_id_teams_id_fk" FOREIGN KEY ("red_team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;
ALTER TABLE "matches" ADD CONSTRAINT "matches_blue_team_id_teams_id_fk" FOREIGN KEY ("blue_team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;
ALTER TABLE "matches" ADD CONSTRAINT "matches_distinct_teams_check" CHECK ("red_team_id" IS NULL OR "blue_team_id" IS NULL OR "red_team_id" <> "blue_team_id");
