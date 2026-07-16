ALTER TABLE "staff_roles" ADD COLUMN "can_participate" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "staff_roles" SET "can_participate" = true WHERE "name" IN ('Commentator', 'Streamer');
--> statement-breakpoint
INSERT INTO "tournament_staff_members" ("tournament_id", "role_id", "user_id")
SELECT "tournaments"."id", "staff_roles"."id", "tournaments"."creator_id"
FROM "tournaments"
JOIN "staff_roles" ON "staff_roles"."name" = 'Host'
ON CONFLICT ("tournament_id", "role_id", "user_id") DO NOTHING;
