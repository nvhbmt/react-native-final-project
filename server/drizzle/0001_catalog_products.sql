CREATE TYPE "public"."catalog_benefit" AS ENUM('free-return', 'buyer-protection', 'best-deal', 'ship-to-store');--> statement-breakpoint
CREATE TYPE "public"."catalog_category" AS ENUM('electronics', 'fashion', 'beauty', 'fruits');--> statement-breakpoint
CREATE TYPE "public"."catalog_shipping" AS ENUM('instant', 'express', 'standard');--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"category" "catalog_category" NOT NULL,
	"subcategory" text NOT NULL,
	"subtitle" text NOT NULL,
	"description" text NOT NULL,
	"keywords" text DEFAULT '' NOT NULL,
	"images" text[] NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"price_basis" text NOT NULL,
	"price_unit" text NOT NULL,
	"price_source_url" text,
	"rating_tenths" integer,
	"review_count" integer DEFAULT 0 NOT NULL,
	"rating_breakdown" jsonb,
	"sales" integer,
	"available" boolean,
	"shipping_options" "catalog_shipping"[] NOT NULL,
	"benefits" "catalog_benefit"[] NOT NULL,
	"variants" jsonb,
	"size_chart" jsonb,
	"featured" boolean DEFAULT false NOT NULL,
	"source_url" text NOT NULL,
	"image_attribution" text,
	CONSTRAINT "catalog_products_price_valid" CHECK ("catalog_products"."price_cents" > 0 AND "catalog_products"."compare_at_price_cents" > "catalog_products"."price_cents"),
	CONSTRAINT "catalog_products_rating_valid" CHECK ("catalog_products"."rating_tenths" BETWEEN 0 AND 50),
	CONSTRAINT "catalog_products_counts_valid" CHECK ("catalog_products"."review_count" >= 0 AND ("catalog_products"."sales" IS NULL OR "catalog_products"."sales" >= 0)),
	CONSTRAINT "catalog_products_images_nonempty" CHECK (cardinality("catalog_products"."images") > 0)
);
--> statement-breakpoint
CREATE INDEX "catalog_products_category_subcategory_idx" ON "catalog_products" USING btree ("category","subcategory");--> statement-breakpoint
CREATE INDEX "catalog_products_price_idx" ON "catalog_products" USING btree ("price_cents");