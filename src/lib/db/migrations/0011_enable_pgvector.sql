-- Custom SQL migration file, put your code below! --
-- pgvector backs book_chunks.embedding (reader RAG, phase 3).
CREATE EXTENSION IF NOT EXISTS vector;
