CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "book_chunks_book_idx";--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "index_fingerprint" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_usage_user_kind_idx" ON "llm_usage" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "book_chunks_book_spine_chunk_idx" ON "book_chunks" USING btree ("book_id","spine_index","chunk_index");