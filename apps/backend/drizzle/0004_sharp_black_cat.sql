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
ALTER TABLE "osu_stats" ADD CONSTRAINT "osu_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;