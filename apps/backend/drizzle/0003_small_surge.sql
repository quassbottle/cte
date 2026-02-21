CREATE TABLE "match_participants" (
	"match_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer,
	"is_winner" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_participants_match_id_user_id_pk" PRIMARY KEY("match_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "solo_participants" DROP CONSTRAINT "solo_participants_match_id_matches_id_fk";
--> statement-breakpoint
DROP INDEX "solo_participants_match_id_idx";--> statement-breakpoint
DROP INDEX "solo_participants_tournament_id_idx";--> statement-breakpoint
DROP INDEX "solo_participants_match_user_unique";--> statement-breakpoint
DROP INDEX "solo_participants_tournament_user_unique";--> statement-breakpoint
ALTER TABLE "solo_participants" ALTER COLUMN "tournament_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_participants" ADD CONSTRAINT "solo_participants_tournament_id_user_id_pk" PRIMARY KEY("tournament_id","user_id");--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_participants" DROP COLUMN "match_id";--> statement-breakpoint
ALTER TABLE "solo_participants" DROP COLUMN "score";--> statement-breakpoint
ALTER TABLE "solo_participants" DROP COLUMN "is_winner";