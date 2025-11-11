-- Final migration script to normalize restock schema
-- This script will modify the restock_transactions table and ensure the restock_items table exists

-- 1. Create the restock_items table if it doesn't exist
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

-- 2. Check if items_json column exists in restock_transactions table
-- If it exists, we need to migrate data and then drop the column
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'restock_transactions' 
  AND COLUMN_NAME = 'items_json'
);

-- 3. If items_json column exists, add is_migrated column for tracking
SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE `restock_transactions` ADD COLUMN `is_migrated` tinyint(1) NOT NULL DEFAULT 0 AFTER `items_json`', 
  'SELECT "Column items_json does not exist, skipping migration setup" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Drop the items_json column from restock_transactions table if it exists
SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE `restock_transactions` DROP COLUMN `items_json`', 
  'SELECT "Column items_json does not exist, skipping drop" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Drop the is_migrated column if it was added
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'restock_transactions' 
  AND COLUMN_NAME = 'is_migrated'
);

SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE `restock_transactions` DROP COLUMN `is_migrated`', 
  'SELECT "Column is_migrated does not exist, skipping drop" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;