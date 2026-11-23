// Converts between the JSON book snapshot stored offline and the props <Reader> takes (Dates revived).
import type { ReaderBook } from '@/lib/services/book-service';
import type { BookAnnotation } from '@/lib/services/annotation-service';
import type { BookBookmark } from '@/lib/services/bookmark-service';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';
import type { BookDeckOptions } from '@/lib/services/book-card-service';
import type { BookAnnotationWire, BookBookmarkWire, OfflineBookSnapshotWire } from './types';

export interface OfflineReaderData {
  book: ReaderBook;
  annotations: BookAnnotation[];
  bookmarks: BookBookmark[];
  preferences: ReaderPreferences;
  deck_options: BookDeckOptions;
}

export function annotationFromWire(a: BookAnnotationWire): BookAnnotation {
  return { ...a, created_at: new Date(a.created_at), updated_at: new Date(a.updated_at) };
}

export function annotationToWire(a: BookAnnotation): BookAnnotationWire {
  return { ...a, created_at: a.created_at.toISOString(), updated_at: a.updated_at.toISOString() };
}

export function bookmarkFromWire(b: BookBookmarkWire): BookBookmark {
  return { ...b, created_at: new Date(b.created_at) };
}

export function bookmarkToWire(b: BookBookmark): BookBookmarkWire {
  return { ...b, created_at: b.created_at.toISOString() };
}

/** The props of <Reader> from a stored snapshot. */
export function snapshotToReaderData(snapshot: OfflineBookSnapshotWire): OfflineReaderData {
  return {
    book: snapshot.book,
    annotations: snapshot.annotations.map(annotationFromWire),
    bookmarks: snapshot.bookmarks.map(bookmarkFromWire),
    preferences: snapshot.preferences,
    deck_options: snapshot.deck_options,
  };
}
