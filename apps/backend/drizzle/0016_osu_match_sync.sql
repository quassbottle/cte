CREATE TABLE "match_osu_sync" (
	"match_id" text PRIMARY KEY NOT NULL,
	"osu_match_id" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_osu_sync_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade,
	CONSTRAINT "match_osu_sync_status_check" CHECK ("status" IN ('active', 'stopped', 'completed'))
);
CREATE UNIQUE INDEX "match_osu_sync_osu_match_id_unique" ON "match_osu_sync" ("osu_match_id");
CREATE INDEX "match_osu_sync_due_idx" ON "match_osu_sync" ("status", "next_sync_at");
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM mappools GROUP BY stage_id HAVING count(*) > 1) THEN
		RAISE EXCEPTION 'Cannot enforce one mappool per stage: duplicate stage_id exists';
	END IF;
END $$;
CREATE UNIQUE INDEX "mappools_stage_id_unique" ON "mappools" ("stage_id");
