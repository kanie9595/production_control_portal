CREATE TABLE `lookup_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`value` varchar(256) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lookup_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`status` enum('running','idle','maintenance','changeover') NOT NULL DEFAULT 'idle',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machines_id` PRIMARY KEY(`id`),
	CONSTRAINT `machines_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `material_recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`product` varchar(256) NOT NULL,
	`description` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`product` varchar(256) NOT NULL,
	`color` varchar(128),
	`quantity` int NOT NULL,
	`completedQty` int NOT NULL DEFAULT 0,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`moldName` varchar(256),
	`rawMaterial` varchar(256),
	`notes` text,
	`createdById` int NOT NULL,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipeId` int NOT NULL,
	`materialName` varchar(256) NOT NULL,
	`percentage` decimal(6,2) NOT NULL DEFAULT '0',
	`weightKg` decimal(10,3),
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipe_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_report_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`machineNumber` varchar(64) NOT NULL,
	`moldProduct` varchar(256) NOT NULL,
	`productColor` varchar(128) NOT NULL,
	`planQty` int NOT NULL DEFAULT 0,
	`actualQty` int NOT NULL DEFAULT 0,
	`standardCycle` decimal(8,2) NOT NULL DEFAULT '0',
	`actualCycle` decimal(8,2) NOT NULL DEFAULT '0',
	`downtimeMin` int NOT NULL DEFAULT 0,
	`downtimeReason` varchar(256),
	`defectKg` decimal(8,2) NOT NULL DEFAULT '0',
	`changeover` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_report_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shiftDate` varchar(32) NOT NULL,
	`shiftNumber` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`assigneeId` int NOT NULL,
	`creatorId` int NOT NULL,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`deadline` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
