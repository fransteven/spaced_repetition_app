/**
 * functions.ts — Inngest functions: daily study reminder digest.
 */

import { inngest } from './client';
import {
  sendDueDigests,
  sendDigestForUser,
} from '@/lib/services/reminder-digest-service';
import { purgeOldVoiceTranscripts } from '@/lib/services/voice-attempt-service';
import { markBookFailed, processBook } from '@/lib/services/book-service';
import { indexBook, markBookIndexFailed } from '@/lib/services/book-rag-service';

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

// Embeds book_sections into book_chunks for "Ask the book". Also queued by
// askBookAction for books uploaded before indexing existed.
export const indexBookForQuestions = inngest.createFunction(
  {
    id: 'book-index',
    name: 'Index EPUB for questions',
    triggers: [{ event: 'app/book.index' }],
    retries: 2,
    concurrency: { key: 'event.data.bookId', limit: 1 },
    onFailure: async ({ event }) => {
      await markBookIndexFailed(event.data.event.data.bookId as string);
    },
  },
  async ({ event, step }) => {
    const bookId = event.data.bookId as string;
    const result = await step.run('chunk-and-embed', () => indexBook(bookId));
    return { bookId, ...result };
  }
);
