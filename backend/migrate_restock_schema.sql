-- Migration script to normalize restock schema
-- This script will create the restock_items table and modify the restock_transactions table

-- 1. Create the new restock_items table (Detail table)
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

-- 2. Add a new column to track if items have been migrated
ALTER TABLE `restock_transactions` 
ADD COLUMN `is_migrated` tinyint(1) NOT NULL DEFAULT 0 AFTER `items_json`;

-- 3. Migration procedure to move data from items_json to restock_items
-- This would be run once to migrate existing data
-- DELIMITER $$
-- CREATE PROCEDURE MigrateRestockData()
-- BEGIN
--   DECLARE done INT DEFAULT FALSE;
--   DECLARE v_restock_id VARCHAR(36);
--   DECLARE v_items_json TEXT;
--   DECLARE v_item JSON;
--   DECLARE i INT DEFAULT 0;
--   DECLARE item_count INT;
--   
--   DECLARE cur CURSOR FOR 
--     SELECT id, items_json FROM restock_transactions 
--     WHERE items_json IS NOT NULL AND items_json != '[]' AND is_migrated = 0;
--     
--   DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
--   
--   OPEN cur;
--   
--   read_loop: LOOP
--     FETCH cur INTO v_restock_id, v_items_json;
--     IF done THEN
--       LEAVE read_loop;
--     END IF;
--     
--     -- Process each item in the JSON array
--     SET i = 0;
--     SET item_count = JSON_LENGTH(v_items_json);
--     
--     WHILE i < item_count DO
--       SET v_item = JSON_EXTRACT(v_items_json, CONCAT('$[', i, ']'));
--       
--       INSERT INTO restock_items (
--         id, restock_id, product_id, product_name, packing_unit, 
--         quantity, cost_per_unit, total_cost
--       ) VALUES (
--         UUID(), v_restock_id,
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.product_id')),
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.product_name')),
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.packing_unit')),
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.quantity')),
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.cost_price')),
--         JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.item_value'))
--       );
--       
--       SET i = i + 1;
--     END WHILE;
--     
--     -- Mark this restock as migrated
--     UPDATE restock_transactions SET is_migrated = 1 WHERE id = v_restock_id;
--     
--   END LOOP;
--   
--   CLOSE cur;
-- END$$
-- DELIMITER ;

-- 4. After migration is complete, we can drop the items_json column
-- ALTER TABLE `restock_transactions` DROP COLUMN `items_json`;
-- ALTER TABLE `restock_transactions` DROP COLUMN `is_migrated`;