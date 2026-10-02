import { pgTable, uuid, text, integer, real, timestamp, boolean, pgEnum, primaryKey, index, uniqueIndex, vector } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from '@auth/core/adapters';

export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);
export const ratingEnum    = pgEnum('rating',     ['again', 'hard', 'good', 'easy']);

export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  email:         text('email').notNull().unique(),
  name:          text('name').notNull(),
  password:      text('password'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image:         text('image'),
  timezone:      text('timezone').notNull().default('America/Bogota'),
  created_at:    timestamp('created_at').defaultNow().notNull(),
});

// Required by @auth/drizzle-adapter for Google OAuth
export const accounts = pgTable('accounts', {
  userId:            uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').$type<AdapterAccountType>().notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
]);

export const decks = pgTable('decks', {
  id:          uuid('id').defaultRandom().primaryKey(),
  user_id:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  subject:     text('subject').notNull().default('Custom'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

export const cards = pgTable('cards', {
  id:          uuid('id').defaultRandom().primaryKey(),
  deck_id:     uuid('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  front:       text('front').notNull(),        // question text
  back:        text('back').notNull(),         // answer text
  image_url_1: text('image_url_1'),            // Cloudinary URL (optional)
  image_url_2: text('image_url_2'),            // Cloudinary URL (optional)
  tags:        text('tags').array().default([]),
  created_at:  timestamp('created_at').defaultNow().notNull(),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
});

// FSRS state — one row per (card, user) pair
export const cardSchedules = pgTable('card_schedules', {
  id:             uuid('id').defaultRandom().primaryKey(),
  card_id:        uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  user_id:        uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  stability:      real('stability').notNull().default(0),   // S — memory strength in days
  difficulty:     real('difficulty').notNull().default(5),  // D — 1-10
  state:          cardStateEnum('state').notNull().default('new'),
  reps:           integer('reps').notNull().default(0),
  lapses:         integer('lapses').notNull().default(0),
  elapsed_days:   integer('elapsed_days').notNull().default(0),
  scheduled_days: integer('scheduled_days').notNull().default(0),
  due_date:       timestamp('due_date').defaultNow().notNull(),
  last_review:    timestamp('last_review'),
});

// Immutable audit trail — never update or delete rows here
export const reviewLogs = pgTable('review_logs', {
  id:             uuid('id').defaultRandom().primaryKey(),
  card_id:        uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  user_id:        uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating:         ratingEnum('rating').notNull(),
  scheduled_days: integer('scheduled_days').notNull(),
  elapsed_days:   integer('elapsed_days').notNull(),
  reviewed_at:    timestamp('reviewed_at').defaultNow().notNull(),
});

// A voice attempt is the idempotency boundary for an automatic review.
// Audio is never stored; transcripts are cleared after 30 days.
export const voiceExamAttempts = pgTable('voice_exam_attempts', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  user_id:              uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  card_id:              uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  card_updated_at:      timestamp('card_updated_at').notNull(),
  schedule_reps:        integer('schedule_reps').notNull(),
  schedule_last_review: timestamp('schedule_last_review'),
  ticket_hash:          text('ticket_hash').unique(),
  ticket_expires_at:    timestamp('ticket_expires_at').notNull(),
  expires_at:           timestamp('expires_at').notNull(),
  status:               text('status').notNull().default('created'),
  transcript:           text('transcript'),
  rating:               ratingEnum('rating'),
  feedback:             text('feedback'),
  skill_used:           text('skill_used'),
  review_log_id:        uuid('review_log_id').references(() => reviewLogs.id).unique(),
  scheduled_days:       integer('scheduled_days'),
  due_date:             timestamp('due_date'),
  live_model:           text('live_model').notNull().default('gemini-3.8-live'),
  grading_model:        text('grading_model').notNull().default('gemini-3.8-flash'),
  created_at:           timestamp('created_at').defaultNow().notNull(),
  completed_at:         timestamp('completed_at'),
}, (table) => [
  index('voice_attempts_user_status_idx').on(table.user_id, table.status),
  index('voice_attempts_created_idx').on(table.created_at),
]);

// User-defined exam skills — used by the LLM examiner to focus study
// exercises on a specific topic (e.g. "English vocabulary", "Anatomy").
export const studySkills = pgTable('study_skills', {
  id:         uuid('id').defaultRandom().primaryKey(),
  user_id:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name:       text('name').notNull(),
  topic:      text('topic').notNull(),
  rubric:     text('rubric').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const reminderPrograms = pgTable('reminder_programs', {
  id:           uuid('id').defaultRandom().primaryKey(),
  user_id:      uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  deck_id:      uuid('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  name:         text('name').notNull(),
  active:       boolean('active').notNull().default(true),
  enable_email: boolean('enable_email').notNull().default(true),
  created_at:   timestamp('created_at').defaultNow().notNull(),
});

// Cadence clock — one row per (program, bucket). Bucket membership is NOT
// stored here; it is recomputed with computeBuckets() on every send.
export const reminderSchedules = pgTable('reminder_schedules', {
  id:            uuid('id').defaultRandom().primaryKey(),
  program_id:    uuid('program_id').references(() => reminderPrograms.id, { onDelete: 'cascade' }).notNull(),
  bucket:        text('bucket').notNull(),        // 'struggling' | 'intermediate' | 'mastered'
  interval_days: integer('interval_days').notNull(),
  next_run_at:   timestamp('next_run_at').notNull(),
  created_at:    timestamp('created_at').defaultNow().notNull(),
});

// Digest audit trail + idempotency guard (one digest per user per day).
export const reminderDeliveries = pgTable('reminder_deliveries', {
  id:          uuid('id').defaultRandom().primaryKey(),
  user_id:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  digest_date: text('digest_date').notNull(),     // 'YYYY-MM-DD' (UTC)
  sent_to:     text('sent_to').notNull(),
  item_count:  integer('item_count').notNull(),
  dedupe_key:  text('dedupe_key').unique().notNull(),
  status:      text('status').notNull(),          // 'sent' | 'failed' | 'empty'
  error:       text('error'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ── Reader (EPUB) ────────────────────────────────────────────────────────────

export const bookStatusEnum     = pgEnum('book_status',     ['processing', 'ready', 'failed']);
export const bookIndexStatusEnum = pgEnum('book_index_status', ['pending', 'indexing', 'ready', 'failed']);
export const highlightColorEnum = pgEnum('highlight_color', ['yellow', 'green', 'blue', 'pink']);
export const readerThemeEnum    = pgEnum('reader_theme',    ['auto', 'light', 'dark', 'sepia']);
export const readerFontEnum     = pgEnum('reader_font',     ['book', 'sans', 'original']);

// One uploaded EPUB. The original file lives in Vercel Blob (private);
// its plain-text version lives in book_sections.
export const books = pgTable('books', {
  id:             uuid('id').defaultRandom().primaryKey(),
  user_id:        uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title:          text('title').notNull(),
  author:         text('author'),
  language:       text('language'),                 // dc:language (BCP-47)
  blob_pathname:  text('blob_pathname').notNull().unique(),
  cover_pathname: text('cover_pathname'),
  file_size:      integer('file_size').notNull(),
  status:         bookStatusEnum('status').notNull().default('processing'),
  error:          text('error'),                    // user-safe message only
  locations_json: text('locations_json'),           // cached epub.js locations
  last_cfi:       text('last_cfi'),
  progress:       real('progress').notNull().default(0), // 0..1
  last_read_at:   timestamp('last_read_at'),
  translate_from: text('translate_from'),           // last translation pair; null = auto-detect
  translate_to:   text('translate_to'),
  index_status:   bookIndexStatusEnum('index_status').notNull().default('pending'), // RAG embeddings
  created_at:     timestamp('created_at').defaultNow().notNull(),
  updated_at:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('books_user_idx').on(table.user_id, table.last_read_at),
]);

// Plain-text version of a book — one row per spine item.
export const bookSections = pgTable('book_sections', {
  id:          uuid('id').defaultRandom().primaryKey(),
  book_id:     uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  spine_index: integer('spine_index').notNull(),
  href:        text('href').notNull(),
  title:       text('title'),
  text:        text('text').notNull(),
}, (table) => [
  uniqueIndex('book_sections_book_spine_idx').on(table.book_id, table.spine_index),
]);

// Retrieval unit for "Ask the book": a few paragraphs of one section plus
// their embedding (gemini-embedding-001, 768 dims, L2-normalized).
export const EMBEDDING_DIMENSIONS = 768;

export const bookChunks = pgTable('book_chunks', {
  id:          uuid('id').defaultRandom().primaryKey(),
  book_id:     uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  section_id:  uuid('section_id').references(() => bookSections.id, { onDelete: 'cascade' }).notNull(),
  spine_index: integer('spine_index').notNull(),     // copy of book_sections.spine_index for filtering
  chunk_index: integer('chunk_index').notNull(),     // order inside the section
  text:        text('text').notNull(),
  embedding:   vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
}, (table) => [
  // Exact search over one book's chunks (a few thousand at most). No global
  // HNSW index: it would filter by book after the ANN search and miss results.
  index('book_chunks_book_idx').on(table.book_id, table.spine_index),
]);

// A highlight with an optional note. A note always hangs off a text range.
export const bookAnnotations = pgTable('book_annotations', {
  id:            uuid('id').defaultRandom().primaryKey(),
  book_id:       uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  user_id:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cfi_range:     text('cfi_range').notNull(),        // EPUB CFI — stable anchor
  quote:         text('quote').notNull(),
  chapter_label: text('chapter_label'),
  color:         highlightColorEnum('color').notNull().default('yellow'),
  note:          text('note'),
  created_at:    timestamp('created_at').defaultNow().notNull(),
  updated_at:    timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('book_annotations_book_idx').on(table.book_id),
]);

// Where a card came from. Keeps its own copy of the anchor so the link
// survives deleting the highlight; removing the book drops the link only.
export const cardSources = pgTable('card_sources', {
  card_id:       uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).primaryKey(),
  user_id:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  book_id:       uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  annotation_id: uuid('annotation_id').references(() => bookAnnotations.id, { onDelete: 'set null' }),
  cfi_range:     text('cfi_range').notNull(),
  created_at:    timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('card_sources_book_idx').on(table.book_id),
  index('card_sources_annotation_idx').on(table.annotation_id),
]);

// Translation cache shared by all users. key = sha256(from, to, text).
export const translationCache = pgTable('translation_cache', {
  key:           text('key').primaryKey(),
  source_lang:   text('source_lang').notNull(),     // detected or requested
  target_lang:   text('target_lang').notNull(),
  translation:   text('translation').notNull(),
  created_at:    timestamp('created_at').defaultNow().notNull(),
});

// Per-user reading preferences, synced across devices.
export const readerPreferences = pgTable('reader_preferences', {
  user_id:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  font_scale:  real('font_scale').notNull().default(1),       // 0.8 – 1.6
  font_family: readerFontEnum('font_family').notNull().default('book'),
  line_height: real('line_height').notNull().default(1.55),
  justify:     boolean('justify').notNull().default(false),
  theme:       readerThemeEnum('theme').notNull().default('sepia'),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
});
