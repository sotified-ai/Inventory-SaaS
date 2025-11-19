-- Migration script for Market Supply module

-- 1. Create the market_supply table
CREATE TABLE IF NOT EXISTS `market_supply` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `supply_number` varchar(255) NOT NULL,
  `supply_timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_quantity_pieces` int NOT NULL DEFAULT 0,
  `total_cartons` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create the market_supply_items table
CREATE TABLE IF NOT EXISTS `market_supply_items` (
  `id` varchar(36) NOT NULL,
  `supply_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `return_quantity` int NOT NULL DEFAULT 0,
  `total_cartons` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supply_id` (`supply_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_market_supply_items_supply_id` FOREIGN KEY (`supply_id`) REFERENCES `market_supply` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
