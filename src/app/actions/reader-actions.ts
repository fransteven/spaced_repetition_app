'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  AskBookSchema,
  BookLocationsSchema,
  CreateAnnotationSchema,
  CreateBookCardSchema,
  ReaderPreferencesSchema,
  ReadingProgressSchema,
  SuggestBookCardSchema,
  TranslateSelectionSchema,
  UpdateAnnotationSchema,
} from '@/lib/validations';
import { translateSelection, type TranslationResult } from '@/lib/services/translation-service';
import { askBook, type AskResult } from '@/lib/services/book-rag-service';
import { inngest } from '@/inngest/client';
import {
  createCardFromBook,
  suggestCardFromPassage,
  type CardSuggestion,
  type CreatedBookCard,
} from '@/lib/services/book-card-service';
import { saveBookLocations, saveReadingProgress } from '@/lib/services/book-service';
import {
  createAnnotation,
  deleteAnnotation,
  updateAnnotation,
  type BookAnnotation,
} from '@/lib/services/annotation-service';
import { updateReaderPreferences } from '@/lib/services/reader-preferences-service';
import { ServiceError } from '@/lib/services/service-error';

const AnnotationIdSchema = z.object({ id: z.string().uuid() });
const AnnotationPatchSchema = AnnotationIdSchema.extend({ patch: UpdateAnnotationSchema });

interface ActionError {
  code: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'INTERNAL_ERROR';
  message: string;
}

interface ActionResult<T> {
  data: T | null;
  error: ActionError | null;
}

/** Shared auth → validate → run → map errors pipeline for reader actions. */
async function run<S extends z.ZodType, T>(
  context: string,
  schema: S,
  input: unknown,
  fn: (userId: string, data: z.infer<S>) => Promise<T>
): Promise<ActionResult<T>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } };
  }

  try {
    return { data: await fn(session.user.id, parsed.data), error: null };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { data: null, error: { code: error.code, message: error.message } };
    }
    console.error(`[${context}]`, error);
    return { data: null, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };
  }
}

export async function saveReadingProgressAction(input: unknown): Promise<ActionResult<null>> {
  return run('saveReadingProgressAction', ReadingProgressSchema, input, async (userId, data) => {
    await saveReadingProgress(userId, data);
    return null;
  });
}

export async function saveBookLocationsAction(input: unknown): Promise<ActionResult<null>> {
  return run('saveBookLocationsAction', BookLocationsSchema, input, async (userId, data) => {
    await saveBookLocations(userId, data);
    return null;
  });
}

export async function createAnnotationAction(input: unknown): Promise<ActionResult<BookAnnotation>> {
  return run('createAnnotationAction', CreateAnnotationSchema, input, createAnnotation);
}

export async function updateAnnotationAction(
  annotationId: string,
  input: unknown
): Promise<ActionResult<BookAnnotation>> {
  return run('updateAnnotationAction', AnnotationPatchSchema, { id: annotationId, patch: input }, (userId, data) =>
    updateAnnotation(userId, data.id, data.patch)
  );
}

export async function deleteAnnotationAction(annotationId: string): Promise<ActionResult<null>> {
  return run('deleteAnnotationAction', AnnotationIdSchema, { id: annotationId }, async (userId, data) => {
    await deleteAnnotation(userId, data.id);
    return null;
  });
}

export async function translateSelectionAction(input: unknown): Promise<ActionResult<TranslationResult>> {
  return run('translateSelectionAction', TranslateSelectionSchema, input, translateSelection);
}

export async function suggestBookCardAction(input: unknown): Promise<ActionResult<CardSuggestion>> {
  return run('suggestBookCardAction', SuggestBookCardSchema, input, suggestCardFromPassage);
}

export async function createBookCardAction(input: unknown): Promise<ActionResult<CreatedBookCard>> {
  return run('createBookCardAction', CreateBookCardSchema, input, createCardFromBook);
}

export async function askBookAction(input: unknown): Promise<ActionResult<AskResult>> {
  return run('askBookAction', AskBookSchema, input, async (userId, data) => {
    const result = await askBook(userId, data);
    // Books uploaded before indexing existed (or whose index failed) are queued lazily.
    if (result.status === 'indexing' && result.needs_index) {
      await inngest.send({ name: 'app/book.index', data: { bookId: data.book_id } });
    }
    return result;
  });
}

export async function updateReaderPreferencesAction(input: unknown): Promise<ActionResult<null>> {
  return run('updateReaderPreferencesAction', ReaderPreferencesSchema, input, async (userId, data) => {
    await updateReaderPreferences(userId, data);
    return null;
  });
}
