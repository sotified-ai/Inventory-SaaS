-- Quick fix for missing packing_unit column in restock_items
-- Run this SQL query on your production database

ALTER TABLE `restock_items`
ADD COLUMN IF NOT EXISTS `packing_unit` varchar(50) DEFAULT NULL AFTER `product_name`;

-- Backfill packing_unit from products table
UPDATE `restock_items` ri
JOIN `products` p ON ri.product_id = p.id
SET ri.packing_unit = p.packing_unit
WHERE ri.packing_unit IS NULL;
