-- Final migration script to update restock schema for Advanced Restock Management
-- This script will modify the restock_transactions table to add deliveryman_name and remove items_json

-- 1. Add deliveryman_name column to restock_transactions table
ALTER TABLE `restock_transactions` 
ADD COLUMN `deliveryman_name` varchar(255) DEFAULT NULL AFTER `booker_name`;

-- 2. Remove items_json column from restock_transactions table
ALTER TABLE `restock_transactions` 
DROP COLUMN `items_json`;

-- 3. Ensure restock_items table exists with proper structure
CREATE TABLE IF NOT EXISTS `restock_items` (
  `id` varchar(36) NOT NULL,
  `restock_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `packing_unit` varchar(50) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `cost_per_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `restock_id` (`restock_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_restock_items_restock_id` FOREIGN KEY (`restock_id`) REFERENCES `restock_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;