// Wire types shared with the offline server endpoints (docs/plans/offline-mode.md, "Wire contract").
// JSON only: every Date crosses the wire as an ISO string.
import type { ReaderBook } from '@/lib/services/book-service';
import type { BookAnnotation } from '@/lib/services/annotation-service';
import type { BookBookmark } from '@/lib/services/bookmark-service';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';
import type { BookDeckOptions } from '@/lib/services/book-card-service';

/** What a value looks like after JSON.stringify → JSON.parse (Date → string). */
export type Jsonify<T> = T extends Date
  ? string
  : T extends ReadonlyArray<infer U>
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

export type CardStateWire = 'new' | 'learning' | 'review' | 'relearning';
export type RatingWire = 'again' | 'hard' | 'good' | 'easy';

/** Shared with the server (src/lib/study/schedule-wire.ts): one definition of the schedule JSON. */
export type { ScheduleWire } from '@/lib/study/schedule-wire';
import type { ScheduleWire } from '@/lib/study/schedule-wire';

export interface CardSourceWire {
  book_id: string;
  book_title: string;
  cfi_range: string;
}

export interface OfflineDeckCardWire {
  card_id: string;
  front: string;
  back: string;
  image_url_1: string | null;
  image_url_2: string | null;
  source: CardSourceWire | null;
  schedule: ScheduleWire;
}

/** GET /api/offline/decks/[id] → data */
export interface OfflineDeckSnapshotWire {
  deck: { id: string; name: string; description: string | null; subject: string };
  cards: OfflineDeckCardWire[];
  server_time: string;
}

export type ReaderBookWire = Jsonify<ReaderBook>;
export type BookAnnotationWire = Jsonify<BookAnnotation>;
export type BookBookmarkWire = Jsonify<BookBookmark>;
export type ReaderPreferencesWire = Jsonify<ReaderPreferences>;
export type BookDeckOptionsWire = Jsonify<BookDeckOptions>;

/** GET /api/offline/books/[id] → data (the reader page's ReaderProps, JSON-serialised). */
export interface OfflineBookSnapshotWire {
  book: ReaderBookWire;
  annotations: BookAnnotationWire[];
  bookmarks: BookBookmarkWire[];
  preferences: ReaderPreferencesWire;
  deck_options: BookDeckOptionsWire;
  file_bytes: number;
}

/** POST /api/study/review — body. */
export interface SubmitReviewBody {
  card_id: string;
  rating: RatingWire;
  client_review_id?: string;
}

/** POST /api/study/review — data. */
export interface SubmitReviewResponseWire {
  scheduled_days: number;
  due_date: string;
  schedule: ScheduleWire;
}

export interface ReviewSyncItemWire {
  client_review_id: string;
  card_id: string;
  rating: RatingWire;
  reviewed_at: string;
}

/** POST /api/study/review/sync — body (1..500 reviews). */
export interface ReviewSyncRequestWire {
  reviews: ReviewSyncItemWire[];
}

export type ReviewSyncStatus = 'applied' | 'duplicate' | 'stale' | 'not_found';

export type ScheduleWithCardWire = { card_id: string } & ScheduleWire;

/** POST /api/study/review/sync — data. */
export interface ReviewSyncResponseWire {
  results: Array<{ client_review_id: string; status: ReviewSyncStatus }>;
  schedules: ScheduleWithCardWire[];
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** The `{ data, error }` envelope used by API routes and Server Actions. */
export interface ApiEnvelope<T> {
  data: T | null;
  /** Usually an ApiErrorCode; typed loosely because it is read off the network. */
  error: { code: string; message: string } | null;
}
