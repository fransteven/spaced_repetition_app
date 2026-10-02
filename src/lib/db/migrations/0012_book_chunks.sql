CREATE TYPE "public"."book_index_status" AS ENUM('pending', 'indexing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "book_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"spine_index" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "index_status" "book_index_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_chunks" ADD CONSTRAINT "book_chunks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_chunks" ADD CONSTRAINT "book_chunks_section_id_book_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."book_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_chunks_book_idx" ON "book_chunks" USING btree ("book_id","spine_index");--> statement-breakpoint
CREATE INDEX "book_chunks_embedding_idx" ON "book_chunks" USING hnsw ("embedding" vector_cosine_ops);