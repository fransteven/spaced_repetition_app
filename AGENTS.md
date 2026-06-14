# AGENTS.md — NeuroCards SRS App
> Read this file in full before writing any code. Rules marked NEVER/ALWAYS/MUST are non-negotiable.
> Full reference: `SRS_Agent_Build_Guide.docx` (project root).

---

## 1. Project Overview

A web-based **spaced repetition flashcard app** (Anki-style). Users create decks, add cards (question + answer + up to 2 images), and study via the **FSRS 4.5 algorithm**. The system schedules automated review reminders via Gmail and Google Calendar.

### Two repos — never merge them

| Repo | Purpose |
|---|---|
| `srs-app/` | Next.js 16 · App Router · API Routes · FSRS engine · reminder scheduler |
| `srs-llm-api/` | FastAPI · future LLM microservice (card suggestions, explanations) |

---

## 2. Stack

```
Frontend : Next.js 16 (App Router) · TypeScript · TailwindCSS · shadcn/ui
Database : NeonDB (PostgreSQL serverless) · Drizzle ORM
Auth     : NextAuth v5 (next-auth@beta) · @auth/drizzle-adapter
Images   : Cloudinary (server-only)
Reminders: Gmail MCP · Google Calendar MCP
LLM layer: FastAPI + Anthropic SDK (Phase 6 only — do not build until Phase 1–5 done)
Deploy   : Vercel (Next.js) · Railway or Render (FastAPI)
```

---

## 3. Repository Structure

```
srs-app/
├── src/
│   ├── app/
│   │   ├── (auth)/                   ← Route group: login, register
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/              ← Route group: authenticated pages
│   │   │   ├── layout.tsx            ← Shared sidebar + nav
│   │   │   ├── page.tsx              ← /dashboard
│   │   │   ├── decks/page.tsx
│   │   │   ├── decks/[id]/page.tsx
│   │   │   ├── study/[id]/page.tsx
│   │   │   └── reminders/page.tsx
│   │   └── api/                      ← Route handlers
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── decks/route.ts
│   │       ├── decks/[id]/route.ts
│   │       ├── cards/route.ts
│   │       ├── cards/[id]/route.ts
│   │       ├── study/session/route.ts
│   │       ├── study/review/route.ts
│   │       └── reminders/route.ts
│   ├── components/
│   │   ├── ui/                       ← shadcn/ui primitives (DO NOT EDIT)
│   │   ├── cards/
│   │   ├── study/
│   │   ├── decks/
│   │   └── reminders/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              ← DB singleton (only import from here)
│   │   │   ├── schema.ts             ← All table definitions (source of truth)
│   │   │   └── migrations/
│   │   ├── fsrs/
│   │   │   ├── algorithm.ts          ← FSRS core (do not modify without citing spec)
│   │   │   ├── constants.ts          ← W weights + default retention
│   │   │   └── types.ts
│   │   ├── cloudinary.ts             ← Server-only image upload
│   │   ├── scheduler.ts              ← Reminder bucketing logic
│   │   └── validations.ts            ← Zod schemas for all API inputs
│   └── types/index.ts
├── drizzle.config.ts
├── middleware.ts                      ← Auth protection for (dashboard) routes
├── AGENTS.md                         ← (this file)
└── .env.local
```

---

## 4. Database Schema

**NEVER deviate from these exact column names.** They are used throughout the codebase.

### 4.1 Connection — `src/lib/db/index.ts`

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

### 4.2 Schema — `src/lib/db/schema.ts`

```typescript
import { pgTable, uuid, text, integer, real, timestamp,
         boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);
export const ratingEnum    = pgEnum('rating',     ['again', 'hard', 'good', 'easy']);
export const subjectEnum   = pgEnum('subject',    ['english', 'science', 'math', 'history', 'custom']);

export const users = pgTable('users', {
  id:         uuid('id').defaultRandom().primaryKey(),
  email:      text('email').notNull().unique(),
  name:       text('name').notNull(),
  timezone:   text('timezone').notNull().default('America/Bogota'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const decks = pgTable('decks', {
  id:          uuid('id').defaultRandom().primaryKey(),
  user_id:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  subject:     subjectEnum('subject').notNull().default('custom'),
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
```

### 4.3 Migration commands

```bash
npx drizzle-kit generate   # create migration files
npx drizzle-kit migrate    # apply to database
npx drizzle-kit studio     # GUI inspector (dev only)
```

---

## 5. FSRS 4.5 Algorithm

### 5.1 Variables

| Variable | Meaning |
|---|---|
| `S` (stability) | Days before 90% retention decays. Grows on successful reviews. |
| `D` (difficulty) | Intrinsic difficulty 1–10. Adjusts from user rating history. |
| `R` (retrievability) | `0.9^(elapsed / S)` — current recall probability. |
| state | `new → learning → review → relearning` |

### 5.2 Rating map

| Button | Value | Meaning |
|---|---|---|
| Again | 1 | Forgot completely |
| Hard | 2 | Recalled with difficulty |
| Good | 3 | Recalled correctly |
| Easy | 4 | Recalled perfectly |

### 5.3 W weights — `src/lib/fsrs/constants.ts`

```typescript
export const FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722,  // w[0-3]  initial stability by rating
  7.2102, 0.5316, 1.0651, 0.0589,   // w[4-7]  difficulty params
  1.5330, 0.1544, 1.0042, 1.9395,   // w[8-11] stability increase + lapse
  0.1100, 0.2900, 2.2700, 0.1600,   // w[12-15] hard modifier context
  2.9898, 0.5100, 0.4338            // w[16-18] easy modifier + interval params
];
export const DEFAULT_DESIRED_RETENTION = 0.9;
```

### 5.4 Review result must be written atomically

```typescript
// POST /api/study/review — always use a transaction
const result = review(currentSchedule, rating); // src/lib/fsrs/algorithm.ts

await db.transaction(async (tx) => {
  await tx.update(cardSchedules)
    .set({
      stability:      result.stability,
      difficulty:     result.difficulty,
      state:          result.state,
      reps:           result.reps,
      lapses:         result.lapses,
      scheduled_days: result.scheduledDays,
      elapsed_days:   result.elapsedDays,
      due_date:       result.dueDate,
      last_review:    result.lastReview,
    })
    .where(eq(cardSchedules.card_id, cardId));

  await tx.insert(reviewLogs).values({
    card_id:        cardId,
    user_id:        userId,
    rating,
    scheduled_days: result.scheduledDays,
    elapsed_days:   result.elapsedDays,
  });
});
```

---

## 6. API Routes

### 6.1 Response envelope — always use this shape

```typescript
// Success
{ "data": <payload>, "error": null }

// Error
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Error codes: `UNAUTHORIZED` · `VALIDATION_ERROR` · `NOT_FOUND` · `FORBIDDEN` · `INTERNAL_ERROR`

### 6.2 Route table

| Method + Route | Body / Params | Notes |
|---|---|---|
| `GET /api/decks` | — | Authenticated user's decks only |
| `POST /api/decks` | `{ name, description?, subject }` | |
| `GET /api/decks/[id]` | — | Includes card count + due count |
| `PATCH /api/decks/[id]` | `{ name?, description? }` | Verify ownership |
| `DELETE /api/decks/[id]` | — | Cascades to cards + schedules |
| `GET /api/cards?deckId=` | — | All cards for a deck |
| `POST /api/cards` | `{ deck_id, front, back, image_url_1?, image_url_2?, tags? }` | |
| `PATCH /api/cards/[id]` | `{ front?, back?, image_url_1?, image_url_2?, tags? }` | |
| `DELETE /api/cards/[id]` | — | Also deletes card_schedule row |
| `GET /api/study/session?deckId=` | — | Returns ordered due cards (see §6.3) |
| `POST /api/study/review` | `{ card_id, rating }` | Runs FSRS, writes atomically |
| `GET /api/reminders` | — | User's reminder programs |
| `POST /api/reminders` | `{ name, deck_id }` | Creates GCal events + Gmail email |
| `DELETE /api/reminders/[id]` | — | Cancels calendar events |

### 6.3 Study session card ordering (strict — do not reorder)

1. `state = 'learning' OR 'relearning'` AND `due_date <= now` (most urgent)
2. `state = 'review'` AND `due_date <= now` AND `stability < 10` (Struggling)
3. `state = 'review'` AND `due_date <= now` AND `stability >= 10 AND < 50` (Intermediate)
4. `state = 'review'` AND `due_date <= now` AND `stability >= 50` (Mastered)
5. `state = 'new'` (random, max 20 per session)

### 6.4 Canonical API route pattern

```typescript
// src/app/api/decks/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { decks } from '@/lib/db/schema';

const CreateDeckSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject:     z.enum(['english', 'science', 'math', 'history', 'custom']),
});

export async function POST(request: Request) {
  // 1. Auth check — always first
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  // 2. Parse + validate body
  const body = await request.json();
  const parsed = CreateDeckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  // 3. DB operation in try/catch
  try {
    const [deck] = await db
      .insert(decks)
      .values({ ...parsed.data, user_id: session.user.id })
      .returning();
    return NextResponse.json({ data: deck, error: null }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/decks]', e); // full error server-side only
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create deck' } },
      { status: 500 }
    );
  }
}
```

---

## 7. Reminder Program System

### 7.1 Stability buckets (Cepeda et al., 2008)

| Bucket | Stability range | Interval | Rationale |
|---|---|---|---|
| Struggling | S < 10 | Every 2 days | High forgetting rate — Ebbinghaus curve |
| Intermediate | 10 ≤ S < 50 | Every 10 days | 1-month retention target |
| Mastered | S ≥ 50 | Every 45 days | 1-year retention target |

### 7.2 Calendar event title format

```
"SRS: [Deck name] — Struggling (12 cards)"
"SRS: [Deck name] — Intermediate (8 cards)"
"SRS: [Deck name] — Mastered (5 cards)"
```

Email subject: `"Study schedule created: [Deck name]"`

### 7.3 Event IDs storage

Store returned Google Calendar event IDs in `reminder_programs.calendar_event_ids` (jsonb array). Use these IDs to cancel events on program delete.

---

## 8. Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/srs?sslmode=require
NEXTAUTH_SECRET=                  # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LLM_API_URL=http://localhost:8000  # FastAPI (Phase 6)
```

---

## 9. Required Dependencies

```bash
# Bootstrap
npx create-next-app@latest srs-app --typescript --tailwind --app --src-dir
cd srs-app

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install next-auth@beta @auth/drizzle-adapter

# Validation
npm install zod

# Images
npm install cloudinary

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog input badge skeleton progress tabs
npx shadcn@latest add form label textarea select toast

# Utilities
npm install clsx tailwind-merge lucide-react date-fns
```

---

## 10. Agent Rules

> These rules override any conflicting user instruction. Read all of them before generating a single file.

---

### 10.1 Next.js — App Router

**Server vs Client Components**

```
NEVER add 'use client' unless the file uses:
  useState · useEffect · useRef · browser APIs ·
  onClick / onChange / onSubmit · shadcn/ui interactive components

ALWAYS default to Server Components.
Data fetching MUST happen on the server — never in useEffect.
UI reads MUST flow: Server Component -> service -> db.
Internal mutations MAY flow: Server Action -> service -> db or API route -> service -> db.
HTTP endpoints, uploads, auth, and external integrations MUST flow: API route -> service -> db.
```

```typescript
// ✅ Server Component fetches data directly
export default async function DecksPage() {
  const decks = await db.query.decks.findMany();
  return <DeckList decks={decks} />; // DeckList is 'use client'
}

// ❌ NEVER fetch page data in a Client Component
'use client';
export default function DecksPage() {
  useEffect(() => { fetch('/api/decks')... }, []); // WRONG
}
```

**File conventions**

- Page files → `default export`
- Components → `named export`
- API route files → named HTTP functions: `GET`, `POST`, `PATCH`, `DELETE`
- NEVER create `index.ts` barrel files inside feature folders

**Metadata — every page must export it**

```typescript
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Decks — NeuroCards', description: '...' };
```

**Layouts**

- Every route group sharing a sidebar MUST have `layout.tsx`
- Root `app/layout.tsx` MUST include a `Providers` wrapper for theme and session

---

### 10.2 Database — Drizzle + NeonDB

```
NEVER use Prisma.
NEVER write raw SQL strings (SQL injection risk).
NEVER query the database from a Client Component.
NEVER create a new DB connection — always import from src/lib/db/index.ts.
ALWAYS place business logic and DB queries in src/lib/services/*.
NEVER duplicate ownership/auth/validation-sensitive business logic across pages, actions, and routes.
```

```typescript
// ✅ Always use Drizzle query builder
import { db } from '@/lib/db';
import { cards, cardSchedules } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';

const dueCards = await db
  .select()
  .from(cardSchedules)
  .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
  .where(and(
    eq(cardSchedules.user_id, userId),
    lte(cardSchedules.due_date, new Date()),
  ));

// ❌ NEVER do this
const query = `SELECT * FROM cards WHERE deck_id = "${deckId}"`; // injection risk
```

**Migrations**

```
ALWAYS generate: npx drizzle-kit generate
ALWAYS apply:    npx drizzle-kit migrate
NEVER manually edit migration files after creation.
NEVER run drizzle-kit push in production.
```

**Type inference — always use Drizzle inferred types, never write them manually**

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cards } from '@/lib/db/schema';

type Card    = InferSelectModel<typeof cards>;
type NewCard = InferInsertModel<typeof cards>;
```

---

### 10.3 API Routes

```
NEVER return raw database errors to the client.
NEVER trust request body without Zod validation.
NEVER skip authentication check.
ALWAYS use the { data, error } response envelope.
ALWAYS verify resource ownership (deck.user_id === session.user.id).
ALWAYS keep route handlers thin and delegate business logic to src/lib/services/*.
```

Ownership check pattern:

```typescript
const [deck] = await db.select().from(decks).where(eq(decks.id, deckId));
if (!deck) return notFound();
if (deck.user_id !== session.user.id) return forbidden();
```

---

### 10.4 TypeScript

```
NEVER use `any`.
NEVER use `as` type assertion except on JSON.parse() results.
NEVER use @ts-ignore.
ALWAYS define explicit return types on exported functions.
ALWAYS use Drizzle inferred types — never write DB types manually.
```

---

### 10.5 TailwindCSS + shadcn/ui

```
NEVER write custom CSS files.
NEVER use inline style={{ }} for anything Tailwind can express.
NEVER modify files inside src/components/ui/ — they are auto-generated.
ALWAYS use the cn() helper for conditional classes.
ALWAYS use shadcn/ui primitives — never build Button, Modal, or Input from scratch.
```

```typescript
// ✅ Correct
import { cn } from '@/lib/utils';
<span className={cn('px-2 py-1 rounded-full text-xs', active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} />

// ❌ Wrong
<span style={{ color: 'green', padding: '4px 8px' }} />
```

**Additional Tailwind rules**

- Use responsive prefixes (`sm:` `md:` `lg:`) — never fixed pixel widths
- Dark mode MUST be supported from day one using `dark:` prefix
- Typography: use `text-sm`, `text-base`, `text-lg` — never `font-size` in px

**Install shadcn components before using them**

```bash
npx shadcn@latest add <component-name>
```

---

### 10.6 Images (Cloudinary)

```
NEVER expose CLOUDINARY_API_SECRET to the client.
NEVER import cloudinary in a Client Component or page file.
ALWAYS route image uploads through an API route.
ALWAYS validate MIME type and file size (max 5 MB) before uploading.
```

```typescript
// src/lib/cloudinary.ts — SERVER ONLY, never import in client files
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadCardImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Image exceeds 5 MB limit');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Invalid image type');
  const b64     = Buffer.from(await file.arrayBuffer()).toString('base64');
  const dataURI = `data:${file.type};base64,${b64}`;
  const result  = await cloudinary.uploader.upload(dataURI, {
    folder: 'srs-cards',
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
  });
  return result.secure_url;
}
```

---

### 10.7 FSRS Algorithm

```
NEVER modify algorithm logic without citing the FSRS 4.5 spec in the comment.
NEVER let users manually set due_date, stability, or difficulty.
NEVER process a rating without writing to BOTH card_schedules AND review_logs.
ALWAYS use a database transaction for review writes.
ALWAYS call review() from src/lib/fsrs/algorithm.ts — never inline the logic.
```

---

### 10.8 Security

```
NEVER store secrets in code or expose them client-side.
NEVER use localStorage for session data — NextAuth handles this.
NEVER trust userId from request body — always read from session.
ALWAYS check session at the start of every API route.
ALWAYS verify ownership before any mutating operation on a resource.
```

---

### 10.9 Error Handling

```
ALWAYS wrap database operations in try/catch.
ALWAYS log errors server-side with route context: console.error('[POST /api/decks]', e)
NEVER send stack traces or DB error details in the HTTP response.
```

---

### 10.10 Build & Deploy

```
NEVER commit .env.local (already in .gitignore — verify before first push).
ALWAYS run `npx tsc --noEmit` before committing.
ALWAYS run `npx next build` locally before deploying to Vercel.
NEVER run drizzle-kit push against production — only drizzle-kit migrate.
Next.js → Vercel. FastAPI → Railway or Render. Never deploy both on the same host.
```

---

### 10.11 Forms & Validation (Zod + react-hook-form)

```
ALWAYS use Zod schemas to validate form inputs.
ALWAYS manage form states using react-hook-form with the zodResolver from @hookform/resolvers/zod.
ALWAYS infer form TypeScript types dynamically from Zod schemas using z.infer<typeof Schema>.
NEVER duplicate form types manually.
```

Example Form Implementation:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

type FormValues = z.infer<typeof FormSchema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: '' }
  });
  
  const onSubmit = (data: FormValues) => {
    // Process form data
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### 10.12 Helper Utilities

```
ALWAYS use the cn() helper function from src/lib/utils.ts for conditional and merged Tailwind classes.
ALWAYS use the formatCurrency() helper function from src/lib/utils.ts when displaying monetary/currency values.
```

Example Utilities Implementation:
```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

---

## 11. Build Phases — Complete Each Before Starting the Next

| Phase | Scope |
|---|---|
| **1 — Foundation** | NeonDB schema · Drizzle setup · NextAuth · `middleware.ts` · root layout · Providers |
| **2 — Cards & Decks** | All API routes for decks + cards · Deck list page · Card editor with image upload |
| **3 — Study Session** | FSRS engine (`src/lib/fsrs/`) · Study session page · `POST /api/study/review` |
| **4 — Dashboard** | Study stats · card due forecast · streak counter · activity heatmap |
| **5 — Reminders** | `src/lib/scheduler.ts` · Gmail MCP + Google Calendar MCP integration |
| **6 — FastAPI LLM** | Only start after Phases 1–5 are fully working and deployed |

---

## 12. Quick Reference — NEVER vs ALWAYS

| Topic | NEVER | ALWAYS |
|---|---|---|
| Components | Add `'use client'` by default | Default to Server Components |
| Data fetching | `useEffect` for page data | Fetch on the server via Server Component/API route calling `src/lib/services/*` |
| ORM | Use Prisma or raw SQL | Use Drizzle query builder |
| DB connection | Create a new connection | Import `db` from `src/lib/db/index.ts` |
| Business logic | Duplicate DB logic in pages/routes/actions | Centralize business logic in `src/lib/services/*` |
| API inputs | Trust without validation | Validate with Zod first |
| API responses | Return raw DB errors | Use `{ data, error }` envelope |
| User identity | Read userId from request body | Read from `session.user.id` |
| Styling | Write custom CSS or inline `style={}` | Use Tailwind + `cn()` |
| UI primitives | Build Button/Modal/Input from scratch | Use shadcn/ui |
| Types | Use `any` or `as` casts | Use Drizzle inferred types |
| FSRS writes | Skip review_logs or write outside a transaction | Atomic transaction every time |
| Secrets | Import Cloudinary in client code | Keep all secrets server-side |
| Migrations | Manually edit migration files | Use `drizzle-kit generate` + `migrate` |

---

## 13. Scientific Basis for Scheduling Intervals

Do not change these intervals without a peer-reviewed citation.

| Paper | Application |
|---|---|
| Ebbinghaus (1885) | Forgetting curve — justifies high frequency for Struggling cards |
| Cepeda et al. (2008), *Psychological Science* | Source of Struggling (2d) / Intermediate (10d) / Mastered (45d) intervals |
| Ye et al. (2022), SIGKDD | FSRS algorithm foundation — source of W weight parameters |
| Kornell & Bjork (2008), *Psychological Science* | Supports interleaving cards from different difficulty buckets in one session |
