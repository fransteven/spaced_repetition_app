CREATE TABLE "voice_exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"card_updated_at" timestamp NOT NULL,
	"schedule_reps" integer NOT NULL,
	"schedule_last_review" timestamp,
	"ticket_hash" text,
	"ticket_expires_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"transcript" text,
	"rating" "rating",
	"feedback" text,
	"skill_used" text,
	"review_log_id" uuid,
	"scheduled_days" integer,
	"due_date" timestamp,
	"live_model" text DEFAULT 'gemini-3.8-live' NOT NULL,
	"grading_model" text DEFAULT 'gemini-3.8-flash' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "voice_exam_attempts_ticket_hash_unique" UNIQUE("ticket_hash"),
	CONSTRAINT "voice_exam_attempts_review_log_id_unique" UNIQUE("review_log_id")
);
--> statement-breakpoint
ALTER TABLE "voice_exam_attempts" ADD CONSTRAINT "voice_exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_exam_attempts" ADD CONSTRAINT "voice_exam_attempts_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_exam_attempts" ADD CONSTRAINT "voice_exam_attempts_review_log_id_review_logs_id_fk" FOREIGN KEY ("review_log_id") REFERENCES "public"."review_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_attempts_user_status_idx" ON "voice_exam_attempts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "voice_attempts_created_idx" ON "voice_exam_attempts" USING btree ("created_at");