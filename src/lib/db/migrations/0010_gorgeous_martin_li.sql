CREATE TABLE "card_sources" (
	"card_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"annotation_id" uuid,
	"cfi_range" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"source_lang" text NOT NULL,
	"target_lang" text NOT NULL,
	"translation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "translate_from" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "translate_to" text;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_annotation_id_book_annotations_id_fk" FOREIGN KEY ("annotation_id") REFERENCES "public"."book_annotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_sources_book_idx" ON "card_sources" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "card_sources_annotation_idx" ON "card_sources" USING btree ("annotation_id");