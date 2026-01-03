CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"osu_id" integer NOT NULL,
	"osu_username" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_osu_id_unique" UNIQUE("osu_id")
);
