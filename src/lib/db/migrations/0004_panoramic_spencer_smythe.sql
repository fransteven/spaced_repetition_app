ALTER TABLE "review_logs" DROP CONSTRAINT "review_logs_card_id_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "review_logs" DROP CONSTRAINT "review_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;