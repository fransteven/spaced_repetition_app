import { pgTable, uuid, text, integer, real, timestamp, boolean, jsonb, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
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
  card_id:        uuid('card_id').references(() => cards.id).notNull(),
  user_id:        uuid('user_id').references(() => users.id).notNull(),
  rating:         ratingEnum('rating').notNull(),
  scheduled_days: integer('scheduled_days').notNull(),
  elapsed_days:   integer('elapsed_days').notNull(),
  reviewed_at:    timestamp('reviewed_at').defaultNow().notNull(),
});

export const reminderPrograms = pgTable('reminder_programs', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  user_id:            uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  deck_id:            uuid('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  name:               text('name').notNull(),
  active:             boolean('active').notNull().default(true),
  calendar_event_ids: jsonb('calendar_event_ids').default('[]'),
  created_at:         timestamp('created_at').defaultNow().notNull(),
});
