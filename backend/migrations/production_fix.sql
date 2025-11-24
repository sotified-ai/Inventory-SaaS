-- =====================================================
-- Production Database Fix Script
-- Adds missing columns to existing tables
-- =====================================================
-- Run this on your production database to fix errors
-- =====================================================

-- Fix invoices table - add missing columns
ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `final_discount_amount` decimal(10,2) DEFAULT 0.00 AFTER `total_amount`,
ADD COLUMN IF NOT EXISTS `final_total_amount` decimal(10,2) DEFAULT 0.00 AFTER `final_discount_amount`,
ADD COLUMN IF NOT EXISTS `sale_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP AFTER `final_total_amount`,
ADD COLUMN IF NOT EXISTS `subtotal` decimal(10,2) DEFAULT 0.00 AFTER `total_amount`,
ADD COLUMN IF NOT EXISTS `total` decimal(10,2) DEFAULT 0.00 AFTER `subtotal`,
ADD COLUMN IF NOT EXISTS `discount_percentage` decimal(5,2) DEFAULT 0.00 AFTER `total`,
ADD COLUMN IF NOT EXISTS `deliveryman_name` varchar(200) DEFAULT NULL AFTER `customer_name`;

-- Backfill final_total_amount from total_amount if NULL
UPDATE `invoices` SET `final_total_amount` = `total_amount` WHERE `final_total_amount` = 0 OR `final_total_amount` IS NULL;
UPDATE `invoices` SET `sale_timestamp` = `created_at` WHERE `sale_timestamp` IS NULL;

-- Fix invoice_items table - add product_name for faster queries
ALTER TABLE `invoice_items`
ADD COLUMN IF NOT EXISTS `product_name` varchar(200) DEFAULT NULL AFTER `product_id`;

-- Backfill product_name from products table
UPDATE `invoice_items` ii
JOIN `products` p ON ii.product_id = p.id
SET ii.product_name = p.name
WHERE ii.product_name IS NULL;

-- Fix market_supply table - add created_by column
ALTER TABLE `market_supply`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`,
ADD COLUMN IF NOT EXISTS `total_ctns` int(11) DEFAULT 0 AFTER `total_amount`,
ADD COLUMN IF NOT EXISTS `total_quantity` int(11) DEFAULT 0 AFTER `total_ctns`,
ADD COLUMN IF NOT EXISTS `customer_id` varchar(36) DEFAULT NULL AFTER `market_name`;

-- Backfill created_by from user_id
UPDATE `market_supply` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Fix market_supply_items table - add product_name
ALTER TABLE `market_supply_items`
ADD COLUMN IF NOT EXISTS `product_name` varchar(200) DEFAULT NULL AFTER `product_id`;

-- Backfill product_name
UPDATE `market_supply_items` msi
JOIN `products` p ON msi.product_id = p.id
SET msi.product_name = p.name
WHERE msi.product_name IS NULL;

-- Fix restock_items table - add product_name
ALTER TABLE `restock_items`
ADD COLUMN IF NOT EXISTS `product_name` varchar(200) DEFAULT NULL AFTER `product_id`,
ADD COLUMN IF NOT EXISTS `packing_unit` varchar(50) DEFAULT NULL AFTER `product_name`;

-- Backfill product_name and packing_unit
UPDATE `restock_items` ri
JOIN `products` p ON ri.product_id = p.id
SET ri.product_name = p.name, ri.packing_unit = p.packing_unit
WHERE ri.product_name IS NULL;

-- Fix sales_orders table - add created_by
ALTER TABLE `sales_orders`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`;

-- Backfill created_by from user_id
UPDATE `sales_orders` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Fix customer_returns table - add created_by
ALTER TABLE `customer_returns`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`;

-- Backfill created_by from user_id
UPDATE `customer_returns` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Fix stock_adjustments table - add created_by
ALTER TABLE `stock_adjustments`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`;

-- Backfill created_by from user_id
UPDATE `stock_adjustments` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Fix expenses table - add created_by and related_invoice_id
ALTER TABLE `expenses`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`,
ADD COLUMN IF NOT EXISTS `related_invoice_id` varchar(36) DEFAULT NULL AFTER `description`;

-- Backfill created_by from user_id
UPDATE `expenses` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Fix challans table - add created_by
ALTER TABLE `challans`
ADD COLUMN IF NOT EXISTS `created_by` varchar(36) DEFAULT NULL AFTER `user_id`;

-- Backfill created_by from user_id
UPDATE `challans` SET `created_by` = `user_id` WHERE `created_by` IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_invoices_sale_timestamp ON invoices(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_market_supply_created_by ON market_supply(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON sales_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_returns_created_by ON customer_returns(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_by ON stock_adjustments(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_challans_created_by ON challans(created_by);

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify the changes

-- SELECT COUNT(*) as invoices_with_final_total FROM invoices WHERE final_total_amount > 0;
-- SELECT COUNT(*) as invoice_items_with_product_name FROM invoice_items WHERE product_name IS NOT NULL;
-- SELECT COUNT(*) as market_supply_with_created_by FROM market_supply WHERE created_by IS NOT NULL;
-- SELECT COUNT(*) as restock_items_with_product_name FROM restock_items WHERE product_name IS NOT NULL;

-- =====================================================
-- END OF FIX SCRIPT
-- =====================================================
