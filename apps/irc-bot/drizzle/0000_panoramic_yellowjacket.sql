CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"creation_time" timestamp NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matches_match_id_unique" UNIQUE("match_id"),
	CONSTRAINT "matches_channel_unique" UNIQUE("channel")
);
