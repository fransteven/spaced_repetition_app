-- Custom SQL migration file, put your code below! --
-- The RAG moved from Gemini embeddings (Next.js) to OpenAI embeddings (srs-llm-api). The vector spaces
-- differ, so every existing chunk is discarded and each book is re-indexed by the new service.
DELETE FROM "book_chunks";--> statement-breakpoint
UPDATE "books" SET "index_status" = 'pending' WHERE "index_status" <> 'pending';
