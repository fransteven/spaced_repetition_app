"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderPrograms = exports.reviewLogs = exports.cardSchedules = exports.cards = exports.decks = exports.accounts = exports.users = exports.subjectEnum = exports.ratingEnum = exports.cardStateEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.cardStateEnum = (0, pg_core_1.pgEnum)('card_state', ['new', 'learning', 'review', 'relearning']);
exports.ratingEnum = (0, pg_core_1.pgEnum)('rating', ['again', 'hard', 'good', 'easy']);
exports.subjectEnum = (0, pg_core_1.pgEnum)('subject', ['english', 'science', 'math', 'history', 'custom']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    name: (0, pg_core_1.text)('name').notNull(),
    password: (0, pg_core_1.text)('password'),
    emailVerified: (0, pg_core_1.timestamp)('emailVerified', { mode: 'date' }),
    image: (0, pg_core_1.text)('image'),
    timezone: (0, pg_core_1.text)('timezone').notNull().default('America/Bogota'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Required by @auth/drizzle-adapter for Google OAuth
exports.accounts = (0, pg_core_1.pgTable)('accounts', {
    userId: (0, pg_core_1.uuid)('userId').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').$type().notNull(),
    provider: (0, pg_core_1.text)('provider').notNull(),
    providerAccountId: (0, pg_core_1.text)('providerAccountId').notNull(),
    refresh_token: (0, pg_core_1.text)('refresh_token'),
    access_token: (0, pg_core_1.text)('access_token'),
    expires_at: (0, pg_core_1.integer)('expires_at'),
    token_type: (0, pg_core_1.text)('token_type'),
    scope: (0, pg_core_1.text)('scope'),
    id_token: (0, pg_core_1.text)('id_token'),
    session_state: (0, pg_core_1.text)('session_state'),
}, function (account) { return [
    (0, pg_core_1.primaryKey)({ columns: [account.provider, account.providerAccountId] }),
]; });
exports.decks = (0, pg_core_1.pgTable)('decks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id').references(function () { return exports.users.id; }, { onDelete: 'cascade' }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    subject: (0, exports.subjectEnum)('subject').notNull().default('custom'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.cards = (0, pg_core_1.pgTable)('cards', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    deck_id: (0, pg_core_1.uuid)('deck_id').references(function () { return exports.decks.id; }, { onDelete: 'cascade' }).notNull(),
    front: (0, pg_core_1.text)('front').notNull(), // question text
    back: (0, pg_core_1.text)('back').notNull(), // answer text
    image_url_1: (0, pg_core_1.text)('image_url_1'), // Cloudinary URL (optional)
    image_url_2: (0, pg_core_1.text)('image_url_2'), // Cloudinary URL (optional)
    tags: (0, pg_core_1.text)('tags').array().default([]),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// FSRS state — one row per (card, user) pair
exports.cardSchedules = (0, pg_core_1.pgTable)('card_schedules', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    card_id: (0, pg_core_1.uuid)('card_id').references(function () { return exports.cards.id; }, { onDelete: 'cascade' }).notNull(),
    user_id: (0, pg_core_1.uuid)('user_id').references(function () { return exports.users.id; }, { onDelete: 'cascade' }).notNull(),
    stability: (0, pg_core_1.real)('stability').notNull().default(0), // S — memory strength in days
    difficulty: (0, pg_core_1.real)('difficulty').notNull().default(5), // D — 1-10
    state: (0, exports.cardStateEnum)('state').notNull().default('new'),
    reps: (0, pg_core_1.integer)('reps').notNull().default(0),
    lapses: (0, pg_core_1.integer)('lapses').notNull().default(0),
    elapsed_days: (0, pg_core_1.integer)('elapsed_days').notNull().default(0),
    scheduled_days: (0, pg_core_1.integer)('scheduled_days').notNull().default(0),
    due_date: (0, pg_core_1.timestamp)('due_date').defaultNow().notNull(),
    last_review: (0, pg_core_1.timestamp)('last_review'),
});
// Immutable audit trail — never update or delete rows here
exports.reviewLogs = (0, pg_core_1.pgTable)('review_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    card_id: (0, pg_core_1.uuid)('card_id').references(function () { return exports.cards.id; }).notNull(),
    user_id: (0, pg_core_1.uuid)('user_id').references(function () { return exports.users.id; }).notNull(),
    rating: (0, exports.ratingEnum)('rating').notNull(),
    scheduled_days: (0, pg_core_1.integer)('scheduled_days').notNull(),
    elapsed_days: (0, pg_core_1.integer)('elapsed_days').notNull(),
    reviewed_at: (0, pg_core_1.timestamp)('reviewed_at').defaultNow().notNull(),
});
exports.reminderPrograms = (0, pg_core_1.pgTable)('reminder_programs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id').references(function () { return exports.users.id; }, { onDelete: 'cascade' }).notNull(),
    deck_id: (0, pg_core_1.uuid)('deck_id').references(function () { return exports.decks.id; }, { onDelete: 'cascade' }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    calendar_event_ids: (0, pg_core_1.jsonb)('calendar_event_ids').default('[]'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
