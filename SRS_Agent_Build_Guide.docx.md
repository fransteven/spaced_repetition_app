**SPACED REPETITION APP**

Agent Build Guide — v1.0

For Claude Code · Gemini CLI · Any LLM coding agent

| Frontend Next.js 16 · App Router TailwindCSS · shadcn/ui | Backend Next.js API Routes (primary) FastAPI microservice (LLM layer, future) |
| :---- | :---- |

| Database NeonDB — PostgreSQL serverless Drizzle ORM (type-safe, no magic) | Integrations Gmail MCP · Google Calendar MCP Cloudinary (image storage) |
| :---- | :---- |

# **1\. Purpose of This Document**

This document is the single source of truth for any AI coding agent building the Spaced Repetition App. It replaces vague requirements with explicit rules, schemas, file paths, API contracts, and code conventions. Read this entire document before writing a single line of code.

| HOW TO USE THIS GUIDE Sections 1–4 are context. Sections 5–9 are implementation blueprints. Section 10 is the agent skill ruleset — every rule there is non-negotiable. |
| :---- |

## **1.1 What the app does**

A web-based flashcard system for vocabulary and general knowledge learning. Users create decks of cards with a question front, answer back (text \+ up to 2 images), and study them via the FSRS spaced repetition algorithm. The system schedules automated study reminders via Gmail and Google Calendar.

## **1.2 Core learning principles (inform every design decision)**

* The FSRS algorithm (Free Spaced Repetition Scheduler 4.5) determines review intervals — not the developer.

* Cards the user struggles with must appear more frequently.

* Struggling cards: Stability S \< 10 → review every 1–3 days.

* Intermediate cards: 10 ≤ S \< 50 → review every 7–14 days.

* Mastered cards: S ≥ 50 → review every 30–90 days (Cepeda et al., 2008).

* Never let the user directly set intervals — they rate difficulty (Again / Hard / Good / Easy), the algorithm decides the rest.

# **2\. Repository Structure**

Two separate repositories. Do NOT merge them.

| Repository | Purpose |
| :---- | :---- |
| srs-app/ | Next.js 16 — frontend \+ API routes \+ FSRS engine \+ reminder scheduler |
| srs-llm-api/ | FastAPI — future LLM microservice (AI-generated card suggestions, explanations) |

## **2.1 Next.js project tree (srs-app/)**

| srs-app/ ├── src/ │   ├── app/                        ← App Router root │   │   ├── (auth)/                 ← Route group — login / register │   │   │   ├── login/page.tsx │   │   │   └── register/page.tsx │   │   ├── (dashboard)/            ← Route group — authenticated pages │   │   │   ├── layout.tsx          ← Shared sidebar \+ nav │   │   │   ├── page.tsx            ← /dashboard home │   │   │   ├── decks/page.tsx      ← Deck list │   │   │   ├── decks/\[id\]/page.tsx ← Single deck view │   │   │   ├── study/\[id\]/page.tsx ← Study session │   │   │   └── reminders/page.tsx  ← Reminder programs │   │   └── api/                    ← API Routes (route handlers) │   │       ├── auth/\[...nextauth\]/route.ts │   │       ├── decks/route.ts │   │       ├── decks/\[id\]/route.ts │   │       ├── cards/route.ts │   │       ├── cards/\[id\]/route.ts │   │       ├── study/session/route.ts │   │       ├── study/review/route.ts │   │       └── reminders/route.ts │   ├── components/ │   │   ├── ui/                     ← shadcn/ui primitives (DO NOT edit) │   │   ├── cards/                  ← Card-specific components │   │   ├── study/                  ← Study session components │   │   ├── decks/                  ← Deck management components │   │   └── reminders/              ← Reminder program components │   ├── lib/ │   │   ├── db/                     ← Drizzle ORM setup │   │   │   ├── index.ts            ← DB connection singleton │   │   │   ├── schema.ts           ← All table definitions │   │   │   └── migrations/         ← SQL migration files │   │   ├── fsrs/                   ← FSRS 4.5 engine │   │   │   ├── algorithm.ts        ← Core FSRS calculations │   │   │   ├── constants.ts        ← W parameters \+ default weights │   │   │   └── types.ts            ← FSRSCard, FSRSState, Rating │   │   ├── cloudinary.ts           ← Image upload utility │   │   ├── scheduler.ts            ← Reminder program logic (grouping \+ timing) │   │   └── validations.ts          ← Zod schemas for all API inputs │   └── types/                      ← Shared TypeScript types │       └── index.ts ├── drizzle.config.ts ├── middleware.ts                   ← Auth protection ├── .env.local └── next.config.ts |
| :---- |

## **2.2 FastAPI project tree (srs-llm-api/)**

| srs-llm-api/ ├── app/ │   ├── main.py                     ← FastAPI app entry point │   ├── routers/ │   │   └── suggestions.py          ← POST /suggest endpoint │   ├── services/ │   │   └── llm\_service.py          ← Anthropic / Groq client │   └── models/ │       └── schemas.py              ← Pydantic models ├── requirements.txt └── .env |
| :---- |

# **3\. Database Schema (NeonDB / PostgreSQL)**

| ⚠️ NEVER Never use Prisma. Use Drizzle ORM exclusively. Never use WidthType.PERCENTAGE in DXA tables. This section defines the exact schema — do not deviate from column names. |
| :---- |

## **3.1 Connection setup — src/lib/db/index.ts**

| import { neon } from '@neondatabase/serverless'; import { drizzle } from 'drizzle-orm/neon-http'; import \* as schema from './schema'; const sql \= neon(process.env.DATABASE\_URL\!); export const db \= drizzle(sql, { schema }); export type DB \= typeof db; |
| :---- |

## **3.2 Full schema — src/lib/db/schema.ts**

| import { pgTable, uuid, text, integer, real, timestamp,          boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'; // ── Enums ────────────────────────────────────────────────── export const cardStateEnum \= pgEnum('card\_state',   \['new', 'learning', 'review', 'relearning'\]); export const ratingEnum \= pgEnum('rating',   \['again', 'hard', 'good', 'easy'\]); export const subjectEnum \= pgEnum('subject',   \['english', 'science', 'math', 'history', 'custom'\]); // ── users ─────────────────────────────────────────────────── export const users \= pgTable('users', {   id:         uuid('id').defaultRandom().primaryKey(),   email:      text('email').notNull().unique(),   name:       text('name').notNull(),   timezone:   text('timezone').notNull().default('America/Bogota'),   created\_at: timestamp('created\_at').defaultNow().notNull(), }); // ── decks ─────────────────────────────────────────────────── export const decks \= pgTable('decks', {   id:          uuid('id').defaultRandom().primaryKey(),   user\_id:     uuid('user\_id').references(() \=\> users.id, { onDelete: 'cascade' }).notNull(),   name:        text('name').notNull(),   description: text('description'),   subject:     subjectEnum('subject').notNull().default('custom'),   created\_at:  timestamp('created\_at').defaultNow().notNull(), }); // ── cards ─────────────────────────────────────────────────── export const cards \= pgTable('cards', {   id:          uuid('id').defaultRandom().primaryKey(),   deck\_id:     uuid('deck\_id').references(() \=\> decks.id, { onDelete: 'cascade' }).notNull(),   front:       text('front').notNull(),              // question text   back:        text('back').notNull(),               // answer text   image\_url\_1: text('image\_url\_1'),                  // Cloudinary URL   image\_url\_2: text('image\_url\_2'),                  // Cloudinary URL   tags:        text('tags').array().default(\[\]),   created\_at:  timestamp('created\_at').defaultNow().notNull(),   updated\_at:  timestamp('updated\_at').defaultNow().notNull(), }); // ── card\_schedules (FSRS state per card per user) ──────────── export const cardSchedules \= pgTable('card\_schedules', {   id:             uuid('id').defaultRandom().primaryKey(),   card\_id:        uuid('card\_id').references(() \=\> cards.id, { onDelete: 'cascade' }).notNull(),   user\_id:        uuid('user\_id').references(() \=\> users.id, { onDelete: 'cascade' }).notNull(),   // FSRS core variables   stability:      real('stability').notNull().default(0),   // S: memory strength   difficulty:     real('difficulty').notNull().default(5),  // D: 1–10 scale   state:          cardStateEnum('state').notNull().default('new'),   reps:           integer('reps').notNull().default(0),      // total reviews   lapses:         integer('lapses').notNull().default(0),    // times forgotten   elapsed\_days:   integer('elapsed\_days').notNull().default(0),   scheduled\_days: integer('scheduled\_days').notNull().default(0),   due\_date:       timestamp('due\_date').defaultNow().notNull(),   last\_review:    timestamp('last\_review'), }); // ── review\_logs (immutable audit trail) ───────────────────── export const reviewLogs \= pgTable('review\_logs', {   id:             uuid('id').defaultRandom().primaryKey(),   card\_id:        uuid('card\_id').references(() \=\> cards.id).notNull(),   user\_id:        uuid('user\_id').references(() \=\> users.id).notNull(),   rating:         ratingEnum('rating').notNull(),   scheduled\_days: integer('scheduled\_days').notNull(),   elapsed\_days:   integer('elapsed\_days').notNull(),   reviewed\_at:    timestamp('reviewed\_at').defaultNow().notNull(), }); // ── reminder\_programs ─────────────────────────────────────── export const reminderPrograms \= pgTable('reminder\_programs', {   id:                uuid('id').defaultRandom().primaryKey(),   user\_id:           uuid('user\_id').references(() \=\> users.id, { onDelete: 'cascade' }).notNull(),   deck\_id:           uuid('deck\_id').references(() \=\> decks.id, { onDelete: 'cascade' }).notNull(),   name:              text('name').notNull(),   active:            boolean('active').notNull().default(true),   calendar\_event\_ids: jsonb('calendar\_event\_ids').default('\[\]'),   created\_at:        timestamp('created\_at').defaultNow().notNull(), }); |
| :---- |

# **4\. FSRS 4.5 Algorithm**

FSRS (Free Spaced Repetition Scheduler) is a modern alternative to SM-2. It models each card with three continuous variables and produces the next review interval based on desired retention (default: 90%).

## **4.1 Core variables**

| Variable | Description |
| :---- | :---- |
| S (Stability) | Days to retain 90% memory. Grows with each successful review. |
| D (Difficulty) | Intrinsic difficulty 1–10. Adjusted based on user rating history. |
| R (Retrievability) | Current probability of recall. R \= 0.9^(t/S) where t \= elapsed days. |
| State | new | learning | review | relearning |

## **4.2 Rating map**

| User presses | Internal rating value |
| :---- | :---- |
| Again | 1 — completely forgot |
| Hard | 2 — recalled with difficulty |
| Good | 3 — recalled correctly |
| Easy | 4 — recalled perfectly |

## **4.3 Implementation — src/lib/fsrs/algorithm.ts**

| import { FSRS\_WEIGHTS, DEFAULT\_DESIRED\_RETENTION } from './constants'; import type { FSRSCard, Rating, ReviewResult } from './types'; // Retrievability: probability of recall after t elapsed days export function retrievability(stability: number, elapsedDays: number): number {   return Math.pow(0.9, elapsedDays / stability); } // Next interval from current stability export function nextInterval(stability: number, desiredRetention \= DEFAULT\_DESIRED\_RETENTION): number {   return Math.round(stability \* Math.log(desiredRetention) / Math.log(0.9)); } // Initial stability by rating (first review of a new card) export function initialStability(rating: Rating): number {   const w \= FSRS\_WEIGHTS;   return Math.max(w\[rating \- 1\], 0.1); // w\[0-3\] } // Update stability after successful recall (rating \>= Good) export function newStability(card: FSRSCard, rating: Rating): number {   const { stability: s, difficulty: d, reps } \= card;   const w \= FSRS\_WEIGHTS;   const r \= retrievability(s, card.elapsed\_days);   return s \* (Math.exp(w\[8\]) \*     (11 \- d) \*     Math.pow(s, \-w\[9\]) \*     (Math.exp((1 \- r) \* w\[10\]) \- 1\) \*     (rating \=== 2 ? w\[15\] : 1\) \*  // Hard modifier     (rating \=== 4 ? w\[16\] : 1\)    // Easy modifier   \+ 1); } // Update difficulty export function newDifficulty(difficulty: number, rating: Rating): number {   const w \= FSRS\_WEIGHTS;   const delta \= w\[6\] \* (rating \- 3); // 3 \= Good (neutral)   return Math.min(Math.max(difficulty \- delta, 1), 10); } // Main review function — call this on every card review export function review(card: FSRSCard, rating: Rating): ReviewResult {   const now \= new Date();   let { stability, difficulty, state, reps, lapses } \= card;   let scheduledDays: number;   if (state \=== 'new') {     stability  \= initialStability(rating);     difficulty \= w\[4\] \- w\[5\] \* (rating \- 3);     if (rating \=== 1\) { state \= 'learning'; scheduledDays \= 0; }       // 10 min     else if (rating \=== 4\) { state \= 'review'; scheduledDays \= nextInterval(stability); }     else { state \= 'learning'; scheduledDays \= 1; }   } else if (state \=== 'learning' || state \=== 'relearning') {     if (rating \=== 1\) { scheduledDays \= 0; }    // retry in 10 min     else if (rating \>= 3\) {       state \= 'review';       stability \= rating \=== 4         ? Math.max(stability \* FSRS\_WEIGHTS\[16\], stability \+ 1\)         : stability;       scheduledDays \= nextInterval(stability);     } else { scheduledDays \= 1; }   } else {  // review     if (rating \=== 1\) {       lapses++;       state \= 'relearning';       stability \= Math.max(stability \* FSRS\_WEIGHTS\[11\], 0.1);       difficulty \= newDifficulty(difficulty, rating);       scheduledDays \= 0;     } else {       stability  \= newStability(card, rating);       difficulty \= newDifficulty(difficulty, rating);       scheduledDays \= nextInterval(stability);     }   }   reps++;   const dueDate \= new Date(now);   if (scheduledDays \=== 0\) dueDate.setMinutes(dueDate.getMinutes() \+ 10);   else dueDate.setDate(dueDate.getDate() \+ scheduledDays);   return {     stability, difficulty, state, reps, lapses,     scheduledDays,     elapsedDays: card.elapsed\_days,     dueDate,     lastReview: now,   }; } const w \= FSRS\_WEIGHTS; // shorthand used above |
| :---- |

## **4.4 Constants — src/lib/fsrs/constants.ts**

| // FSRS 4.5 default W weights (19 parameters) // Source: https://github.com/open-spaced-repetition/fsrs4anki export const FSRS\_WEIGHTS \= \[   0.4072, 1.1829, 3.1262, 15.4722,   // w\[0-3\]  initial stability by rating   7.2102, 0.5316, 1.0651, 0.0589,    // w\[4-7\]  difficulty params   1.5330, 0.1544, 1.0042, 1.9395,    // w\[8-11\] stability increase \+ lapse   0.1100, 0.2900, 2.2700, 0.1600,    // w\[12-15\] hard modifier context   2.9898, 0.5100, 0.4338             // w\[16-18\] easy modifier \+ interval params \]; export const DEFAULT\_DESIRED\_RETENTION \= 0.9; // 90% |
| :---- |

# **5\. API Routes Contract**

All routes live under src/app/api/. All responses use a consistent envelope. All inputs are validated with Zod before touching the database.

## **5.1 Response envelope**

| // Success { "data": \<payload\>, "error": null } // Error { "data": null, "error": { "code": "VALIDATION\_ERROR", "message": "..." } } |
| :---- |

## **5.2 Route table**

| Route \+ Method | Description |
| :---- | :---- |
| GET /api/decks | List all decks for authenticated user |
| POST /api/decks | Create a new deck. Body: { name, description, subject } |
| GET /api/decks/\[id\] | Get single deck with card count and due count |
| PATCH /api/decks/\[id\] | Update deck name / description |
| DELETE /api/decks/\[id\] | Delete deck and all its cards (cascade) |
| GET /api/cards?deckId= | List all cards in a deck |
| POST /api/cards | Create card. Body: { deck\_id, front, back, image\_url\_1?, image\_url\_2?, tags? } |
| PATCH /api/cards/\[id\] | Update card content |
| DELETE /api/cards/\[id\] | Delete card and its schedule |
| GET /api/study/session?deckId= | Returns ordered due cards (Struggling first, then Intermediate, then Mastered) |
| POST /api/study/review | Submit a rating. Body: { card\_id, rating }. Runs FSRS and updates card\_schedules \+ review\_logs |
| GET /api/reminders | List reminder programs for user |
| POST /api/reminders | Create reminder program and schedule Gmail \+ GCal events |
| DELETE /api/reminders/\[id\] | Delete program and cancel calendar events |

## **5.3 Study session ordering (GET /api/study/session)**

Cards must be returned in this exact order to prioritize weak areas:

1. Cards with state \= learning or relearning and due\_date \<= now (most urgent).

2. Cards with state \= review, due\_date \<= now, stability \< 10 (Struggling bucket).

3. Cards with state \= review, due\_date \<= now, 10 \<= stability \< 50 (Intermediate bucket).

4. Cards with state \= review, due\_date \<= now, stability \>= 50 (Mastered bucket).

5. Cards with state \= new (randomly ordered, max 20 per session by default).

# **6\. Reminder Program System**

When a user creates a Reminder Program for a deck, the system groups cards by FSRS stability bucket and creates a scheduled review plan using Gmail MCP and Google Calendar MCP.

## **6.1 Bucket definitions and intervals**

| Bucket | Stability range |
| :---- | :---- |
| Struggling | S \< 10 |
| Intermediate | 10 ≤ S \< 50 |
| Mastered | S ≥ 50 |

## **6.2 Scheduler logic — src/lib/scheduler.ts**

| import { db } from './db'; import { cardSchedules, cards, reminderPrograms } from './db/schema'; import { eq, and, lt, gte } from 'drizzle-orm'; export type Bucket \= 'struggling' | 'intermediate' | 'mastered'; export function getBucket(stability: number): Bucket {   if (stability \< 10\) return 'struggling';   if (stability \< 50\) return 'intermediate';   return 'mastered'; } export function getIntervalDays(bucket: Bucket): number {   switch (bucket) {     case 'struggling':   return 2;   // mid-point of 1–3 day range     case 'intermediate': return 10;  // mid-point of 7–14 day range     case 'mastered':     return 45;  // mid-point of 30–90 day range   } } export async function buildReminderSchedule(deckId: string, userId: string) {   // Get all card schedules for deck   const schedules \= await db     .select({ stability: cardSchedules.stability, cardId: cardSchedules.card\_id })     .from(cardSchedules)     .innerJoin(cards, eq(cards.id, cardSchedules.card\_id))     .where(and(eq(cards.deck\_id, deckId), eq(cardSchedules.user\_id, userId)));   // Group by bucket   const buckets: Record\<Bucket, string\[\]\> \= {     struggling: \[\], intermediate: \[\], mastered: \[\]   };   schedules.forEach(s \=\> buckets\[getBucket(s.stability)\].push(s.cardId));   // Build events: Struggling sessions first, then Intermediate, then Mastered   const events \= \[\];   const now \= new Date();   for (const \[bucket, cardIds\] of Object.entries(buckets) as \[Bucket, string\[\]\]\[\]) {     if (cardIds.length \=== 0\) continue;     const intervalDays \= getIntervalDays(bucket);     // Create 4 future sessions for each bucket     for (let i \= 1; i \<= 4; i++) {       const sessionDate \= new Date(now);       sessionDate.setDate(sessionDate.getDate() \+ intervalDays \* i);       events.push({ bucket, cardCount: cardIds.length, date: sessionDate, intervalDays });     }   }   return events.sort((a, b) \=\> a.date.getTime() \- b.date.getTime()); } |
| :---- |

## **6.3 Gmail and Calendar integration (POST /api/reminders)**

Use the existing Gmail MCP and Google Calendar MCP connections. For each reminder program:

6. Call buildReminderSchedule() to get the session list.

7. For each session: create a Google Calendar event with title "SRS Study: \[Deck name\] — \[Bucket\] cards" and duration 30 minutes.

8. Send a Gmail summary email listing all upcoming sessions grouped by bucket.

9. Store the calendar event IDs in reminder\_programs.calendar\_event\_ids (jsonb array).

| // Email subject format: "Study schedule created: \[Deck name\]" // Calendar event title format: "SRS: \[Deck name\] — Struggling (12 cards)" "SRS: \[Deck name\] — Intermediate (8 cards)" "SRS: \[Deck name\] — Mastered (5 cards)" |
| :---- |

# **7\. Environment Variables**

| \# .env.local \# Database DATABASE\_URL=postgresql://user:password@ep-xxx.neon.tech/srs?sslmode=require \# Auth NEXTAUTH\_SECRET=\<generate with: openssl rand \-base64 32\> NEXTAUTH\_URL=http://localhost:3000 \# Cloudinary (image storage) NEXT\_PUBLIC\_CLOUDINARY\_CLOUD\_NAME=your\_cloud\_name CLOUDINARY\_API\_KEY=your\_api\_key CLOUDINARY\_API\_SECRET=your\_api\_secret \# FastAPI microservice (for future LLM features) LLM\_API\_URL=http://localhost:8000 |
| :---- |

# **8\. Component & UI Patterns**

## **8.1 shadcn/ui usage rules**

* Use shadcn/ui primitives from src/components/ui/ for ALL UI elements: Button, Card, Dialog, Input, Badge, Skeleton, Progress, Tabs, etc.

* Never build a custom button, modal, or form field from scratch.

* Install components with: npx shadcn@latest add \<component\>

* Do not modify files inside src/components/ui/ — they are auto-generated.

## **8.2 Flashcard component**

| // src/components/cards/FlashCard.tsx import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { Badge } from '@/components/ui/badge'; import Image from 'next/image'; type Props \= {   card: { front: string; back: string; image\_url\_1?: string; image\_url\_2?: string };   revealed: boolean;   onReveal: () \=\> void;   onRate: (rating: 'again' | 'hard' | 'good' | 'easy') \=\> void; }; export function FlashCard({ card, revealed, onReveal, onRate }: Props) {   return (     \<Card className='w-full max-w-2xl mx-auto min-h-\[320px\] flex flex-col'\>       \<CardContent className='flex-1 flex flex-col items-center justify-center p-8 gap-6'\>         \<p className='text-xl font-medium text-center'\>{card.front}\</p\>         {\!revealed && (           \<Button onClick={onReveal} size='lg'\>Show Answer\</Button\>         )}         {revealed && (           \<\>             \<div className='w-full border-t pt-6 flex flex-col items-center gap-4'\>               \<p className='text-lg text-center text-muted-foreground'\>{card.back}\</p\>               {card.image\_url\_1 && (                 \<Image src={card.image\_url\_1} alt='' width={400} height={240}                   className='rounded-lg object-contain max-h-60' /\>               )}               {card.image\_url\_2 && (                 \<Image src={card.image\_url\_2} alt='' width={400} height={240}                   className='rounded-lg object-contain max-h-60' /\>               )}             \</div\>             \<div className='flex gap-3 w-full justify-center flex-wrap'\>               \<Button variant='destructive' onClick={() \=\> onRate('again')}\>Again\</Button\>               \<Button variant='outline'    onClick={() \=\> onRate('hard')}\>Hard\</Button\>               \<Button                      onClick={() \=\> onRate('good')}\>Good\</Button\>               \<Button variant='secondary'  onClick={() \=\> onRate('easy')}\>Easy\</Button\>             \</div\>           \</\>         )}       \</CardContent\>     \</Card\>   ); } |
| :---- |

# **9\. FastAPI Microservice (srs-llm-api/)**

This service is built for future LLM features: AI-generated card suggestions, definition lookups, example sentences. It is NOT required for the MVP — build it only after the Next.js app is fully functional.

## **9.1 main.py**

| from fastapi import FastAPI from fastapi.middleware.cors import CORSMiddleware from app.routers import suggestions app \= FastAPI(title='SRS LLM API', version='1.0.0') app.add\_middleware(   CORSMiddleware,   allow\_origins=\['http://localhost:3000'\],   allow\_methods=\['POST'\],   allow\_headers=\['\*'\], ) app.include\_router(suggestions.router, prefix='/api') |
| :---- |

## **9.2 Suggestion endpoint — POST /api/suggest**

| \# routers/suggestions.py from fastapi import APIRouter, HTTPException from pydantic import BaseModel from app.services.llm\_service import generate\_card\_suggestion router \= APIRouter() class SuggestRequest(BaseModel):     term: str     subject: str \= 'english'     context: str \= '' class SuggestResponse(BaseModel):     front: str     back: str     example\_sentence: str @router.post('/suggest', response\_model=SuggestResponse) async def suggest\_card(req: SuggestRequest):     try:         return await generate\_card\_suggestion(req.term, req.subject, req.context)     except Exception as e:         raise HTTPException(status\_code=500, detail=str(e)) |
| :---- |

# **10\. Agent Skill Rules**

These rules apply to Claude Code, Gemini CLI, and any other AI coding agent. They are non-negotiable. Deviating from them produces bugs, security issues, or architecture violations.

| HOW TO READ THIS SECTION Each rule starts with NEVER, ALWAYS, or MUST. Read every rule before generating any file. If a rule conflicts with a user instruction, the rule wins. |
| :---- |

## **10.1 Next.js 16 — App Router rules**

**Server Components vs Client Components**

| ⚠️ NEVER NEVER add 'use client' to a file unless it uses: useState, useEffect, useRef, browser APIs, event handlers (onClick etc.), or shadcn/ui interactive components. Data fetching MUST happen in Server Components or API routes. |
| :---- |
| **✅ RULE** ALWAYS default to Server Components. Add 'use client' only when forced to. |

| // ✅ CORRECT — Server Component fetches data // src/app/(dashboard)/decks/page.tsx import { db } from '@/lib/db'; import { DeckList } from '@/components/decks/DeckList'; // client component export default async function DecksPage() {   const decks \= await db.query.decks.findMany(); // server-side   return \<DeckList decks={decks} /\>; } // ❌ WRONG — fetching in client component 'use client'; export default function DecksPage() {   const \[decks, setDecks\] \= useState(\[\]);   useEffect(() \=\> { fetch('/api/decks').then(...) }, \[\]); // NEVER do this for page data } |
| :---- |

**File and export conventions**

* **Page files MUST use default export.**

* **Components MUST use named exports.**

* **API route files MUST export named HTTP method functions: GET, POST, PATCH, DELETE.**

* **Never create index.ts barrel files inside feature folders.**

| // ✅ API route — named HTTP exports // src/app/api/decks/route.ts export async function GET(request: Request) { ... } export async function POST(request: Request) { ... } |
| :---- |

**Metadata and layouts**

* Every page MUST export metadata: export const metadata: Metadata \= { title: '...', description: '...' };

* Every route group that shares a sidebar MUST have its own layout.tsx.

* The root layout (app/layout.tsx) MUST include Providers wrapper for theme and session.

## **10.2 Database rules (Drizzle \+ NeonDB)**

| ⚠️ NEVER NEVER use Prisma. NEVER use raw SQL strings without parameterized queries. NEVER query the database from a Client Component. |
| :---- |
| **✅ RULE** ALWAYS use Drizzle ORM query builder or prepared statements. ALWAYS import db from src/lib/db/index.ts — never create a new connection. |

| // ✅ Correct Drizzle query import { db } from '@/lib/db'; import { cards } from '@/lib/db/schema'; import { eq, and, lte } from 'drizzle-orm'; const dueCards \= await db   .select()   .from(cards)   .where(and(eq(cards.deck\_id, deckId), lte(cardSchedules.due\_date, new Date())))   .orderBy(cardSchedules.stability); // ❌ Wrong — raw string interpolation const query \= \`SELECT \* FROM cards WHERE deck\_id \= "${deckId}"\`; // SQL INJECTION RISK |
| :---- |

* Migrations MUST be generated with: npx drizzle-kit generate

* Migrations MUST be applied with: npx drizzle-kit migrate

* NEVER manually edit migration files after they are created.

* NEVER run drizzle-kit push in production — only in local dev.

## **10.3 API route rules**

| ⚠️ NEVER NEVER return raw database errors to the client. NEVER trust user input without Zod validation. NEVER skip authentication checks in API routes. |
| :---- |
| **✅ RULE** ALWAYS validate request bodies with Zod. ALWAYS return the standard response envelope. ALWAYS check the user session before any database operation. |

| // ✅ Correct API route pattern import { NextResponse } from 'next/server'; import { z } from 'zod'; import { auth } from '@/lib/auth'; import { db } from '@/lib/db'; const CreateDeckSchema \= z.object({   name:        z.string().min(1).max(100),   description: z.string().max(500).optional(),   subject:     z.enum(\['english', 'science', 'math', 'history', 'custom'\]), }); export async function POST(request: Request) {   const session \= await auth();   if (\!session) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });   const body \= await request.json();   const parsed \= CreateDeckSchema.safeParse(body);   if (\!parsed.success) return NextResponse.json({ data: null, error: { code: 'VALIDATION\_ERROR', message: parsed.error.message } }, { status: 400 });   try {     const deck \= await db.insert(decks).values({ ...parsed.data, user\_id: session.user.id }).returning();     return NextResponse.json({ data: deck\[0\], error: null }, { status: 201 });   } catch (e) {     console.error('\[POST /api/decks\]', e);  // log full error server-side only     return NextResponse.json({ data: null, error: { code: 'INTERNAL\_ERROR', message: 'Failed to create deck' } }, { status: 500 });   } } |
| :---- |

## **10.4 TypeScript rules**

| ⚠️ NEVER NEVER use 'any' type. NEVER use 'as' type assertion unless casting from JSON.parse(). NEVER disable TypeScript with @ts-ignore. |
| :---- |
| **✅ RULE** ALWAYS define explicit return types on functions. ALWAYS use type-safe Drizzle inferred types. |

| // ✅ Infer types from Drizzle schema (always type-safe) import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'; import { cards } from '@/lib/db/schema'; type Card    \= InferSelectModel\<typeof cards\>; type NewCard \= InferInsertModel\<typeof cards\>; |
| :---- |

## **10.5 TailwindCSS \+ shadcn/ui rules**

| ⚠️ NEVER NEVER write custom CSS files. NEVER use inline style={{ }} for anything that can be expressed in Tailwind. NEVER override shadcn/ui component internals. |
| :---- |
| **✅ RULE** ALWAYS use Tailwind utility classes. ALWAYS use the cn() helper for conditional classes. |

| // ✅ Correct — Tailwind \+ cn() import { cn } from '@/lib/utils'; function StatusBadge({ active }: { active: boolean }) {   return (     \<span className={cn(       'px-2 py-1 rounded-full text-xs font-medium',       active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'     )}\>       {active ? 'Active' : 'Inactive'}     \</span\>   ); } // ❌ Wrong style={{ color: 'green', padding: '4px 8px' }} |
| :---- |

* Use Tailwind's responsive prefixes (sm:, md:, lg:) for all layouts — never fixed pixel widths.

* Dark mode: use dark: prefix — the app MUST support dark mode from day one.

* Typography: use text-sm, text-base, text-lg etc. — never font-size in px.

## **10.6 Image upload rules (Cloudinary)**

| // src/lib/cloudinary.ts — server-only import { v2 as cloudinary } from 'cloudinary'; cloudinary.config({   cloud\_name: process.env.NEXT\_PUBLIC\_CLOUDINARY\_CLOUD\_NAME,   api\_key:    process.env.CLOUDINARY\_API\_KEY,   api\_secret: process.env.CLOUDINARY\_API\_SECRET, }); export async function uploadCardImage(file: File): Promise\<string\> {   const buffer  \= Buffer.from(await file.arrayBuffer());   const b64     \= buffer.toString('base64');   const dataURI \= \`data:${file.type};base64,${b64}\`;   const result  \= await cloudinary.uploader.upload(dataURI, {     folder: 'srs-cards',     transformation: \[{ width: 800, height: 600, crop: 'limit' }\],   });   return result.secure\_url; } |
| :---- |
| **⚠️ NEVER** NEVER expose CLOUDINARY\_API\_SECRET to the client. NEVER import cloudinary in a Client Component. Image uploads MUST go through an API route. |

## **10.7 FSRS rules**

| ⚠️ NEVER NEVER modify the FSRS algorithm logic without a comment citing the FSRS 4.5 specification. NEVER let the user manually set due\_date or stability. NEVER skip writing to review\_logs. |
| :---- |
| **✅ RULE** ALWAYS call the review() function from src/lib/fsrs/algorithm.ts when processing a rating. ALWAYS write the result to both card\_schedules AND review\_logs atomically (use a transaction). |

| // ✅ Correct review handler — POST /api/study/review import { review } from '@/lib/fsrs/algorithm'; import { db } from '@/lib/db'; import { cardSchedules, reviewLogs } from '@/lib/db/schema'; const result \= review(currentSchedule, rating); // Write atomically await db.transaction(async (tx) \=\> {   await tx.update(cardSchedules)     .set({ stability: result.stability, difficulty: result.difficulty,            state: result.state, reps: result.reps, lapses: result.lapses,            scheduled\_days: result.scheduledDays, elapsed\_days: result.elapsedDays,            due\_date: result.dueDate, last\_review: result.lastReview })     .where(eq(cardSchedules.card\_id, cardId));   await tx.insert(reviewLogs).values({     card\_id: cardId, user\_id: userId, rating,     scheduled\_days: result.scheduledDays, elapsed\_days: result.elapsedDays,   }); }); |
| :---- |

## **10.8 Security rules**

| ⚠️ NEVER NEVER store secrets in code or client-side. NEVER use localStorage for session data. NEVER skip CSRF protection. |
| :---- |

* **All API routes MUST verify the authenticated session (auth() from NextAuth) before any operation.**

* **User IDs MUST come from the session — never from the request body.**

* **Foreign key ownership MUST be verified: before modifying a deck, confirm deck.user\_id \=== session.user.id.**

* **File uploads MUST validate MIME type and size limit (max 5 MB per image).**

## **10.9 Error handling rules**

| ✅ RULE ALWAYS wrap database operations in try/catch. ALWAYS log errors server-side with context (\[ROUTE\] error). NEVER expose stack traces or database errors to the client response. |
| :---- |

## **10.10 Build and deployment rules**

* NEVER commit .env.local — it is already in .gitignore.

* ALWAYS run 'npx tsc \--noEmit' before committing to check TypeScript errors.

* ALWAYS run 'npx next build' locally before deploying to Vercel.

* The Next.js app deploys to Vercel. The FastAPI microservice deploys to Railway or Render — never together.

* Use 'npx drizzle-kit studio' to inspect the database during development — never use raw psql on the production database.

## **10.11 Build order (phases)**

Complete each phase fully before starting the next. Do not skip ahead.

10. Phase 1 — Foundation: NeonDB schema, Drizzle setup, NextAuth, middleware, basic layout.

11. Phase 2 — Deck and card CRUD: full API routes, deck list page, card form with image upload.

12. Phase 3 — FSRS study session: algorithm implementation, study session page, review API.

13. Phase 4 — Dashboard: study statistics, card due forecast, streak counter.

14. Phase 5 — Reminder Programs: scheduler logic, Gmail \+ Calendar MCP integration.

15. Phase 6 — FastAPI LLM service: only after Phase 1–5 are fully working.

# **11\. Required Dependencies**

## **11.1 package.json dependencies**

| // Install commands npx create-next-app@latest srs-app \--typescript \--tailwind \--app \--src-dir cd srs-app // Database npm install drizzle-orm @neondatabase/serverless npm install \-D drizzle-kit // Auth npm install next-auth@beta @auth/drizzle-adapter // Validation npm install zod // Image upload npm install cloudinary // shadcn/ui (run after project creation) npx shadcn@latest init npx shadcn@latest add button card dialog input badge skeleton progress tabs npx shadcn@latest add form label textarea select toast // Utilities npm install clsx tailwind-merge lucide-react date-fns |
| :---- |

## **11.2 requirements.txt (FastAPI service)**

| fastapi==0.115.0 uvicorn==0.30.0 pydantic==2.8.0 python-dotenv==1.0.1 anthropic==0.34.0 httpx==0.27.0 |
| :---- |

# **12\. Scientific References**

Decisions in this document are grounded in empirical memory research. Do not change scheduling intervals without a scientific basis.

| Reference | Application in this system |
| :---- | :---- |
| Ebbinghaus, H. (1885). Über das Gedächtnis. | Basis for the forgetting curve. Justifies frequent review of new/struggling material. |
| Cepeda et al. (2008). Spacing Effects in Learning. Psychological Science, 19(11). | Defines optimal inter-study intervals by desired retention period. Source of Struggling/Intermediate/Mastered bucket intervals. |
| Ye, J. et al. (2022). A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling. SIGKDD. | Foundation of FSRS algorithm. Source of the W weight parameters in src/lib/fsrs/constants.ts. |
| Kornell, N. & Bjork, R.A. (2008). Learning Concepts and Categories. Psychological Science, 19(6). | Supports interleaving cards from different difficulty levels within sessions. |

Document version 1.0 — Masterplay / Frankly — **Update this doc before starting any new development phase.**