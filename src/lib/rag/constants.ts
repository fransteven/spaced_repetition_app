/**
 * Vector size of book_chunks.embedding. Kept outside schema.ts so Zod schemas used by client
 * components can share it without importing the database layer. It must match
 * EMBEDDING_DIMENSIONS in the srs-llm-api service (part of the index fingerprint there).
 */
export const EMBEDDING_DIMENSIONS = 768;
