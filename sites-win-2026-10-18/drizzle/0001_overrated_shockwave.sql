CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`order_no` text NOT NULL,
	`merchant` text NOT NULL,
	`amount` integer NOT NULL,
	`token` text NOT NULL,
	`request_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`consent_at` text NOT NULL,
	`source` text NOT NULL,
	`paid_at` text,
	`provider_trade_no` text,
	`notify_count` integer DEFAULT 0 NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`email_id` text,
	`email_lease` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_order_no_unique` ON `payment_orders` (`order_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_token_unique` ON `payment_orders` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_request_unique` ON `payment_orders` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_trade_unique` ON `payment_orders` (`provider_trade_no`);--> statement-breakpoint
CREATE TABLE `payment_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL
);
