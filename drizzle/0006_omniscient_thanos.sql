CREATE TABLE `custom_field_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportRowId` int NOT NULL,
	`fieldId` int NOT NULL,
	`value` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_field_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_report_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`label` varchar(256) NOT NULL,
	`fieldType` enum('text','number','decimal','boolean') NOT NULL DEFAULT 'text',
	`isRequired` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_report_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`materialName` varchar(256) NOT NULL,
	`percentage` decimal(6,2) NOT NULL DEFAULT '0',
	`calculatedKg` decimal(10,3),
	`actualKg` decimal(10,3),
	`batchNumber` varchar(256),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`recipeId` int,
	`product` varchar(256) NOT NULL,
	`baseWeightKg` decimal(10,3),
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lookup_items` ADD `standardWeight` decimal(8,2);--> statement-breakpoint
ALTER TABLE `shift_report_rows` ADD `standardWeight` decimal(8,2);--> statement-breakpoint
ALTER TABLE `shift_report_rows` ADD `avgWeight` decimal(8,2);