-- Create restock_transactions table for MySQL backend
-- This table is used to track all restock operations

CREATE TABLE IF NOT EXISTS `restock_transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `restock_number` varchar(50) NOT NULL UNIQUE,
  `restock_timestamp` datetime NOT NULL,
  `total_restock_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_items_restocked` int NOT NULL DEFAULT 0,
  `booker_name` varchar(255) DEFAULT NULL,
  `items_json` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restock_number` (`restock_number`),
  KEY `user_id` (`user_id`),
  KEY `restock_timestamp` (`restock_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample query to view restock transactions
-- SELECT * FROM restock_transactions ORDER BY restock_timestamp DESC;