import { z } from 'zod';

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

export interface CardData {
  id: string;
  front: string;
  back: string;
  image_url_1: string | null;
  image_url_2: string | null;
  tags: string[] | null;
}

export const CreateReminderProgramSchema = z.object({
  name: z.string().min(1).max(100),
  deck_id: z.string().uuid(),
  enable_gcal: z.boolean(),
  enable_gmail: z.boolean(),
});

export const ToggleReminderProgramSchema = z.object({
  active: z.boolean(),
});
