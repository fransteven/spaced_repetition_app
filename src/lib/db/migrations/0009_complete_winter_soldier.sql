CREATE TYPE "public"."book_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."highlight_color" AS ENUM('yellow', 'green', 'blue', 'pink');--> statement-breakpoint
CREATE TYPE "public"."reader_font" AS ENUM('book', 'sans', 'original');--> statement-breakpoint
CREATE TYPE "public"."reader_theme" AS ENUM('auto', 'light', 'dark', 'sepia');--> statement-breakpoint
CREATE TABLE "book_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cfi_range" text NOT NULL,
	"quote" text NOT NULL,
	"chapter_label" text,
	"color" "highlight_color" DEFAULT 'yellow' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"spine_index" integer NOT NULL,
	"href" text NOT NULL,
	"title" text,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"language" text,
	"blob_pathname" text NOT NULL,
	"cover_pathname" text,
	"file_size" integer NOT NULL,
	"status" "book_status" DEFAULT 'processing' NOT NULL,
	"error" text,
	"locations_json" text,
	"last_cfi" text,
	"progress" real DEFAULT 0 NOT NULL,
	"last_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_blob_pathname_unique" UNIQUE("blob_pathname")
);
--> statement-breakpoint
CREATE TABLE "reader_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"font_scale" real DEFAULT 1 NOT NULL,
	"font_family" "reader_font" DEFAULT 'book' NOT NULL,
	"line_height" real DEFAULT 1.55 NOT NULL,
	"justify" boolean DEFAULT false NOT NULL,
	"theme" "reader_theme" DEFAULT 'sepia' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_annotations" ADD CONSTRAINT "book_annotations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_annotations" ADD CONSTRAINT "book_annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_sections" ADD CONSTRAINT "book_sections_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_preferences" ADD CONSTRAINT "reader_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_annotations_book_idx" ON "book_annotations" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "book_sections_book_spine_idx" ON "book_sections" USING btree ("book_id","spine_index");--> statement-breakpoint
CREATE INDEX "books_user_idx" ON "books" USING btree ("user_id","last_read_at");