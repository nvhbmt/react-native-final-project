CREATE TYPE "public"."inbox_kind" AS ENUM('order', 'payment', 'feedback', 'system');--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "inbox_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_user_created_idx" ON "inbox_messages" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inbox_user_unread_idx" ON "inbox_messages" USING btree ("user_id") WHERE "inbox_messages"."read_at" is null;