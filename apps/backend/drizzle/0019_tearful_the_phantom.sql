CREATE TABLE "staff_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_roles_name_unique" UNIQUE("name")
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
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_role_id_staff_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."staff_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff_members" ADD CONSTRAINT "tournament_staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "staff_roles" ("id", "name") VALUES
  ('ckm123456789012345678901', 'Host'),
  ('ckm123456789012345678902', 'Referee'),
  ('ckm123456789012345678903', 'Mapper'),
  ('ckm123456789012345678904', 'Commentator'),
  ('ckm123456789012345678905', 'Streamer'),
  ('ckm123456789012345678906', 'Playtester')
ON CONFLICT ("name") DO NOTHING;
