import { z } from 'zod';

/**
 * Shapes of the "Ask this book" stream. The srs-llm-api service emits these Server-Sent Events and the
 * Next.js route forwards them untouched. Pure Zod, so client components can import it.
 */

export const AskSourceSchema = z.object({
  n: z.number().int(),
  chunk_id: z.string(),
  section_title: z.string().nullable(),
  href: z.string(), // zip path of the section (book_sections.href)
  locator: z.string(), // opening words of the passage, to find it in the rendered section
  excerpt: z.string(),
});
export type AskSource = z.infer<typeof AskSourceSchema>;

export const AskStageSchema = z.enum(['searching', 'reading', 'writing']);
export type AskStage = z.infer<typeof AskStageSchema>;

export const AskStreamEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('status'), data: z.object({ stage: AskStageSchema }) }),
  z.object({ event: z.literal('token'), data: z.object({ text: z.string() }) }),
  z.object({
    event: z.literal('final'),
    data: z.object({ answer: z.string(), answerable: z.boolean(), sources: z.array(AskSourceSchema) }),
  }),
  z.object({ event: z.literal('indexing'), data: z.object({ reason: z.string() }) }),
  z.object({ event: z.literal('error'), data: z.object({ code: z.string(), message: z.string() }) }),
]);
export type AskStreamEvent = z.infer<typeof AskStreamEventSchema>;

/** The route answers with plain JSON (not a stream) while the book is still being indexed. */
export const AskIndexingReplySchema = z.object({ data: z.object({ status: z.literal('indexing') }) });

export const ApiErrorReplySchema = z.object({ error: z.object({ message: z.string() }) });
