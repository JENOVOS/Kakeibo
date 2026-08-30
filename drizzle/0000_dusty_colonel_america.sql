CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`year` integer DEFAULT 0 NOT NULL,
	`month` integer DEFAULT 0 NOT NULL,
	`category_id` integer,
	`amount` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_budgets_overall` ON `budgets` (`period`,`year`,`month`) WHERE category_id is null;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_budgets_category` ON `budgets` (`period`,`year`,`month`,`category_id`) WHERE category_id is not null;--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'shape' NOT NULL,
	`color` text DEFAULT '#868E96' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_categories_type` ON `categories` (`type`,`is_archived`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_categories_type_name` ON `categories` (`type`,`name`);--> statement-breakpoint
CREATE TABLE `recurrings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category_id` integer,
	`memo` text,
	`kind` text NOT NULL,
	`day` integer NOT NULL,
	`month` integer,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`next_due_on` text NOT NULL,
	`auto_post` integer DEFAULT true NOT NULL,
	`notify_days_before` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_recurrings_due` ON `recurrings` (`is_active`,`next_due_on`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`category_id` integer,
	`memo` text,
	`recurring_id` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recurring_id`) REFERENCES `recurrings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`occurred_on`);--> statement-breakpoint
CREATE INDEX `idx_transactions_type_date` ON `transactions` (`type`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`,`occurred_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_transactions_recurring_date` ON `transactions` (`recurring_id`,`occurred_on`) WHERE recurring_id is not null;