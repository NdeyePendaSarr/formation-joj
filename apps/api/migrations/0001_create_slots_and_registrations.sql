CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slot_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" text NOT NULL,
	"registered_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"discipline_id" uuid NOT NULL,
	"starts_at" timestamp (3) with time zone NOT NULL,
	"ends_at" timestamp (3) with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"registered_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "slots_period_check" CHECK ("slots"."ends_at" > "slots"."starts_at"),
	CONSTRAINT "slots_capacity_check" CHECK ("slots"."capacity" >= 1),
	CONSTRAINT "slots_registered_count_check" CHECK ("slots"."registered_count" BETWEEN 0 AND "slots"."capacity")
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;