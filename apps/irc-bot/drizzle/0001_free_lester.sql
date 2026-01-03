CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"user" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
