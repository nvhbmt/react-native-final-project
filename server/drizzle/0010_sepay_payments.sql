CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_txn_id" text NOT NULL,
	"order_id" uuid,
	"amount_vnd" integer NOT NULL,
	"content" text NOT NULL,
	"reference_code" text,
	"result" text NOT NULL,
	"raw" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_vnd" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_txn_idx" ON "payment_transactions" USING btree ("provider","provider_txn_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_order_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_code_idx" ON "orders" USING btree ("payment_code");