ALTER TABLE "book_chunks" ADD COLUMN "heading" text;--> statement-breakpoint
ALTER TABLE "book_chunks" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "book_chunks" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("book_chunks"."heading", '') || ' ' || coalesce("book_chunks"."context", '') || ' ' || "book_chunks"."text")) STORED;--> statement-breakpoint
CREATE INDEX "book_chunks_search_tsv_idx" ON "book_chunks" USING gin ("search_tsv");