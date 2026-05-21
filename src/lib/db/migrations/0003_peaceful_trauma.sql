ALTER TABLE "decks" ALTER COLUMN "subject" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "subject" SET DEFAULT 'Custom';--> statement-breakpoint
DROP TYPE "public"."subject";