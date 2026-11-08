CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"official_gold_bib" integer,
	"official_silver_bib" integer,
	"official_bronze_bib" integer,
	CONSTRAINT "events_official_result_check" CHECK (("events"."official_gold_bib" IS NULL AND "events"."official_silver_bib" IS NULL AND "events"."official_bronze_bib" IS NULL)
        OR ("events"."official_gold_bib" IS NOT NULL AND "events"."official_silver_bib" IS NOT NULL AND "events"."official_bronze_bib" IS NOT NULL
          AND "events"."official_gold_bib" <> "events"."official_silver_bib"
          AND "events"."official_gold_bib" <> "events"."official_bronze_bib"
          AND "events"."official_silver_bib" <> "events"."official_bronze_bib"))
);
--> statement-breakpoint
CREATE TABLE "podium_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "podium_posts_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" uuid NOT NULL,
	"journalist_name" varchar(100) NOT NULL,
	"gold_bib" integer NOT NULL,
	"silver_bib" integer NOT NULL,
	"bronze_bib" integer NOT NULL,
	"status" text NOT NULL,
	"posted_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "podium_posts_distinct_bibs_check" CHECK ("podium_posts"."gold_bib" <> "podium_posts"."silver_bib" AND "podium_posts"."gold_bib" <> "podium_posts"."bronze_bib" AND "podium_posts"."silver_bib" <> "podium_posts"."bronze_bib"),
	CONSTRAINT "podium_posts_status_check" CHECK ("podium_posts"."status" = 'VALIDE')
);
--> statement-breakpoint
ALTER TABLE "podium_posts" ADD CONSTRAINT "podium_posts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;