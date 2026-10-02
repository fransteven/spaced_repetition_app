import { z } from 'zod';
import { AUTO_DETECT, LANGUAGE_CODES } from '@/lib/translation/languages';

export const RegisterSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const CreateDeckSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject:     z.string().min(1).max(50),
});

export const UpdateDeckSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  subject:     z.string().min(1).max(50).optional(),
});

export const CreateCardSchema = z.object({
  deck_id:     z.string().uuid(),
  front:       z.string().min(1).max(2000),
  back:        z.string().min(1).max(2000),
  image_url_1: z.string().url().optional(),
  image_url_2: z.string().url().optional(),
  tags:        z.array(z.string()).optional().default([]),
});

export const UpdateCardSchema = z.object({
  front:       z.string().min(1).max(2000).optional(),
  back:        z.string().min(1).max(2000).optional(),
  image_url_1: z.string().url().nullable().optional(),
  image_url_2: z.string().url().nullable().optional(),
  tags:        z.array(z.string()).optional(),
});

export const CardEditorFormSchema = CreateCardSchema.pick({
  front: true,
  back: true,
}).extend({
  tags: z.string(),
});

export type CardEditorFormValues = z.infer<typeof CardEditorFormSchema>;

export const SubmitReviewSchema = z.object({
  card_id: z.string().uuid(),
  rating:  z.enum(['again', 'hard', 'good', 'easy']),
});

export const StartVoiceAttemptSchema = z.object({
  card_id: z.string().uuid(),
});

export const FinishVoiceAttemptSchema = z.object({
  transcript: z.string().trim().min(1).max(6000),
  turns: z.number().int().min(1).max(3),
});

export interface CardData {
  id: string;
  front: string;
  back: string;
  image_url_1: string | null;
  image_url_2: string | null;
  tags: string[] | null;
}

export const ExamMessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

export const SubmitExamTurnSchema = z.object({
  card_id:  z.string().uuid(),
  messages: z.array(ExamMessageSchema).max(40),
  exam_token: z.string().max(1000).optional(),
});

export const CreateSkillSchema = z.object({
  name:   z.string().min(1).max(80),
  topic:  z.string().min(1).max(120),
  rubric: z.string().min(1).max(1000),
});

export const CreateReminderProgramSchema = z.object({
  name: z.string().min(1).max(100),
  deck_id: z.string().uuid(),
  enable_email: z.boolean(),
});

export const ToggleReminderProgramSchema = z.object({
  active: z.boolean(),
});

// ── Reader (EPUB) ────────────────────────────────────────────────────────────

export const ConfirmBookUploadSchema = z.object({
  pathname: z.string().min(1).max(200),
  filename: z.string().min(1).max(255),
});

export const UpdateBookSchema = z.object({
  title:  z.string().trim().min(1).max(300).optional(),
  author: z.string().trim().max(300).nullable().optional(),
});

export const ReadingProgressSchema = z.object({
  book_id:  z.string().uuid(),
  cfi:      z.string().min(1).max(2000),
  progress: z.number().min(0).max(1),
});

export const BookLocationsSchema = z.object({
  book_id:        z.string().uuid(),
  locations_json: z.string().min(2).max(2_000_000),
});

export const HighlightColorSchema = z.enum(['yellow', 'green', 'blue', 'pink']);

export const CreateAnnotationSchema = z.object({
  book_id:       z.string().uuid(),
  cfi_range:     z.string().min(1).max(2000),
  quote:         z.string().min(1).max(5000),
  chapter_label: z.string().max(300).nullable().optional(),
  color:         HighlightColorSchema.default('yellow'),
  note:          z.string().max(5000).nullable().optional(),
});

export const UpdateAnnotationSchema = z.object({
  color: HighlightColorSchema.optional(),
  note:  z.string().max(5000).nullable().optional(),
});

export const AnnotationNoteFormSchema = z.object({
  note: z.string().trim().max(5000, 'La nota es demasiado larga'),
});

export type AnnotationNoteFormValues = z.infer<typeof AnnotationNoteFormSchema>;

export const ReaderPreferencesSchema = z.object({
  font_scale:  z.number().min(0.8).max(1.6).optional(),
  font_family: z.enum(['book', 'sans', 'original']).optional(),
  line_height: z.number().min(1.3).max(2).optional(),
  justify:     z.boolean().optional(),
  theme:       z.enum(['auto', 'light', 'dark', 'sepia']).optional(),
});

export type ReaderPreferencesInput = z.infer<typeof ReaderPreferencesSchema>;

// ── Reader phase 2: translation + cards from a passage ───────────────────────

export const TranslationLanguageSchema = z.enum(LANGUAGE_CODES);
export const SourceLanguageSchema = z.union([z.literal(AUTO_DETECT), TranslationLanguageSchema]);

export const TranslateSelectionSchema = z.object({
  book_id: z.string().uuid(),
  text:    z.string().trim().min(1).max(5000),
  context: z.string().max(2000).nullable().optional(),
  from:    SourceLanguageSchema,
  to:      TranslationLanguageSchema,
});

export const TranslateFormSchema = z.object({
  from: SourceLanguageSchema,
  to:   TranslationLanguageSchema,
});

export type TranslateFormValues = z.infer<typeof TranslateFormSchema>;

export const SuggestBookCardSchema = z.object({
  book_id:       z.string().uuid(),
  quote:         z.string().trim().min(1).max(5000),
  context:       z.string().max(2000).nullable().optional(),
  chapter_label: z.string().max(300).nullable().optional(),
  translation:   z.string().max(5000).nullable().optional(),
});

export const CreateBookCardSchema = z.object({
  book_id:       z.string().uuid(),
  deck:          z.union([
    z.object({ id: z.string().uuid() }),
    z.object({ new_name: z.string().trim().min(1).max(100) }),
  ]),
  front:         z.string().trim().min(1).max(2000),
  back:          z.string().trim().min(1).max(2000),
  annotation_id: z.string().uuid().nullable().optional(),
  selection:     CreateAnnotationSchema.pick({ cfi_range: true, quote: true, chapter_label: true })
    .extend({ color: HighlightColorSchema })
    .nullable()
    .optional(),
}).refine((value) => Boolean(value.annotation_id) || Boolean(value.selection), {
  message: 'A highlight or a selection is required',
});

export const NEW_DECK_VALUE = 'new';

export const BookCardFormSchema = z.object({
  deck_id:       z.string().min(1, 'Choose a deck'),
  new_deck_name: z.string().trim().max(100),
  front:         z.string().trim().min(1, 'Write a question').max(2000),
  back:          z.string().trim().min(1, 'Write an answer').max(2000),
}).refine((value) => value.deck_id !== NEW_DECK_VALUE || value.new_deck_name.length > 0, {
  message: 'Name the new deck',
  path: ['new_deck_name'],
});

export type BookCardFormValues = z.infer<typeof BookCardFormSchema>;

// ── Reader phase 3: ask the book (RAG) ───────────────────────────────────────

export const AskBookSchema = z.object({
  book_id:       z.string().uuid(),
  question:      z.string().trim().min(1).max(500),
  history:       z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(12).optional(),
  scope:         z.enum(['read', 'all']),
  position_href: z.string().max(500).nullable().optional(),
});

export const AskBookFormSchema = z.object({
  question: z.string().trim().min(1, 'Ask something about the book').max(500, 'Keep it under 500 characters'),
});

export type AskBookFormValues = z.infer<typeof AskBookFormSchema>;
