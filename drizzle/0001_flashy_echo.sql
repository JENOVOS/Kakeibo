CREATE TABLE `savings_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`target_date` text,
	`memo` text,
	`icon` text DEFAULT 'piggy-bank' NOT NULL,
	`color` text DEFAULT '#2FA37B' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_savings_goals_active` ON `savings_goals` (`is_archived`,`sort_order`);--> statement-breakpoint
ALTER TABLE `recurrings` ADD `savings_goal_id` integer REFERENCES savings_goals(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `savings_goal_id` integer REFERENCES savings_goals(id);--> statement-breakpoint
CREATE INDEX `idx_transactions_goal` ON `transactions` (`savings_goal_id`,`occurred_on`);