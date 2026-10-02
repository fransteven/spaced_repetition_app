/**
 * functions.ts — Inngest functions: daily study reminder digest.
 */

import { inngest } from './client';
import {
  sendDueDigests,
  sendDigestForUser,
} from '@/lib/services/reminder-digest-service';
import { purgeOldVoiceTranscripts } from '@/lib/services/voice-attempt-service';
import { z } from 'zod';
import { markBookFailed, processBook } from '@/lib/services/book-service';
import { failBookIndex } from '@/lib/services/book-index-service';
import { ServiceError } from '@/lib/services/service-error';
import { callLlmService } from '@/lib/llm-client';

// Daily cron at 8:00 AM Colombia time (America/Bogota, UTC-5 year round).
export const dailyStudyDigest = inngest.createFunction(
  {
    id: 'daily-study-digest',
    name: 'Daily study reminder digest',
    triggers: [{ cron: 'TZ=America/Bogota 0 8 * * *' }],
  },
  async ({ step }) => {
    const results = await step.run('send-digests', () =>
      sendDueDigests(new Date())
    );
    return { digests: results.length, results };
  }
);

// Manual trigger from the "Send now" button on /reminders.
export const sendDigestNow = inngest.createFunction(
  {
    id: 'send-digest-now',
    name: 'Send study digest now',
    triggers: [{ event: 'app/study-digest.send' }],
  },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    return step.run('send-digest', () =>
      sendDigestForUser(userId, new Date(), { force: true })
    );
  }
);

export const purgeVoiceTranscripts = inngest.createFunction(
  {
    id: 'purge-voice-transcripts',
    name: 'Clear old voice exam transcripts',
    triggers: [{ cron: 'TZ=America/Bogota 0 3 * * *' }],
  },
  async ({ step }) => {
    await step.run('clear-transcripts', () => purgeOldVoiceTranscripts(new Date()));
    return { cleared: true };
  }
);

// Validates an uploaded EPUB and stores its metadata, cover and text version.
export const processUploadedBook = inngest.createFunction(
  {
    id: 'book-process',
    name: 'Process uploaded EPUB',
    triggers: [{ event: 'app/book.uploaded' }],
    retries: 2,
    onFailure: async ({ event }) => {
      const bookId = event.data.event.data.bookId as string;
      await markBookFailed(bookId, 'We could not process this book. Try uploading it again.');
    },
  },
  async ({ event, step }) => {
    const bookId = event.data.bookId as string;
    const status = await step.run('parse-and-store', () => processBook(bookId));
    if (status === 'ready') {
      await step.sendEvent('queue-index', { name: 'app/book.index', data: { bookId } });
    }
    return { bookId, status };
  }
);

const BookEventSchema = z.object({ bookId: z.string().uuid() });
const IndexStartSchema = z.object({ status: z.enum(['started', 'already_running']) });

// Asks srs-llm-api to index a book for "Ask the book". The service answers 202 and keeps working in the
// background, driving the index state in this app through /api/internal/rag/*. Also queued for books
// uploaded before indexing existed (see getAskContext) and by processUploadedBook.
export const indexBookForQuestions = inngest.createFunction(
  {
    id: 'book-index',
    name: 'Index EPUB for questions',
    triggers: [{ event: 'app/book.index' }],
    retries: 2,
    concurrency: { key: 'event.data.bookId', limit: 1 },
    onFailure: async ({ event }) => {
      const { bookId } = BookEventSchema.parse(event.data.event.data);
      try {
        await failBookIndex(bookId); // only affects a run that is still marked as indexing
      } catch (error) {
        if (!(error instanceof ServiceError)) throw error; // the book may have been deleted meanwhile
      }
    },
  },
  async ({ event, step }) => {
    const { bookId } = BookEventSchema.parse(event.data);
    const result = await step.run('start-index', () =>
      callLlmService('/v1/rag/index', { book_id: bookId }, IndexStartSchema)
    );
    return { bookId, ...result };
  }
);
