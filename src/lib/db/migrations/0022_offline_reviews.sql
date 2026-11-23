ALTER TABLE "review_logs" ADD COLUMN "client_review_id" uuid;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_client_review_id_unique" UNIQUE("client_review_id");