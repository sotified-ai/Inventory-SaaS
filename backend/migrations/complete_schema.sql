-- =====================================================
-- Easy Stock - Complete Database Schema
-- Phase 1 Implementation - Fresh Install
-- =====================================================
-- Run this file on a fresh database to set up all tables
-- =====================================================

-- =====================================================
-- EXISTING TABLES (from original system)
-- =====================================================

CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','stock_manager','sales','accountant','viewer') DEFAULT 'viewer',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `min_stock` int(11) DEFAULT 0,
  `category_id` varchar(36) DEFAULT NULL,
  `packing_unit` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `deliveryman_name` varchar(200) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `final_discount_amount` decimal(10,2) DEFAULT 0.00,
  `final_total_amount` decimal(10,2) DEFAULT 0.00,
  `sale_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT 0,
  `warehouse_id` int(11) DEFAULT 1,
  `customer_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `invoice_number` (`invoice_number`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `customer_id` (`customer_id`),
  KEY `sale_timestamp` (`sale_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `bonus_quantity` int(11) DEFAULT 0,
  `unit_price` decimal(10,2) NOT NULL,
  `cost_price_snapshot` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restock_transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `restock_number` varchar(50) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `supplier_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `restock_number` (`restock_number`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restock_items` (
  `id` varchar(36) NOT NULL,
  `restock_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `restock_id` (`restock_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `market_supply` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `supply_number` varchar(50) NOT NULL,
  `market_name` varchar(200) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `total_ctns` int(11) DEFAULT 0,
  `total_quantity` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `broker_id` varchar(36) DEFAULT NULL,
  `driver_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `supply_number` (`supply_number`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `broker_id` (`broker_id`),
  KEY `driver_id` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `market_supply_items` (
  `id` varchar(36) NOT NULL,
  `market_supply_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `market_supply_id` (`market_supply_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHASE 1: MULTI-WAREHOUSE & STOCK LEVELS
-- =====================================================

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default warehouse
INSERT INTO `warehouses` (`id`, `name`, `address`) VALUES (1, 'Main Warehouse', 'Default warehouse location');

CREATE TABLE IF NOT EXISTS `stock_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `reserved_quantity` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_warehouse` (`product_id`, `warehouse_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHASE 1: MASTER DATA TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` varchar(36) NOT NULL,
  `supplier_code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(36) NOT NULL,
  `customer_code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `credit_limit` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `brokers` (
  `id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `commission_type` enum('percentage','fixed') DEFAULT 'percentage',
  `commission_value` decimal(10,2) DEFAULT 0.00,
  `territory` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `drivers` (
  `id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `vehicle_number` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHASE 1: ORDER-TO-CASH WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS `sales_orders` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `order_number` varchar(50) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `status` enum('draft','confirmed','invoiced','cancelled') DEFAULT 'draft',
  `total_amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `customer_id` (`customer_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challans` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `challan_number` varchar(50) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `driver_id` varchar(36) DEFAULT NULL,
  `status` enum('pending','in_transit','delivered','returned') DEFAULT 'pending',
  `delivery_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `challan_number` (`challan_number`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `invoice_id` (`invoice_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `driver_id` (`driver_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challan_items` (
  `id` varchar(36) NOT NULL,
  `challan_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `challan_id` (`challan_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_returns` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `return_number` varchar(50) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `return_type` enum('good','damaged') DEFAULT 'good',
  `total_amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `invoice_id` (`invoice_id`),
  KEY `warehouse_id` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_return_items` (
  `id` varchar(36) NOT NULL,
  `return_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHASE 1: FINANCIAL INTEGRITY
-- =====================================================

CREATE TABLE IF NOT EXISTS `price_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) NOT NULL,
  `old_cost_price` decimal(10,2) NOT NULL,
  `new_cost_price` decimal(10,2) NOT NULL,
  `old_selling_price` decimal(10,2) NOT NULL,
  `new_selling_price` decimal(10,2) NOT NULL,
  `changed_by` varchar(36) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `changed_by` (`changed_by`),
  KEY `changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `related_invoice_id` varchar(36) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `expense_date` (`expense_date`),
  KEY `category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commission_entries` (
  `id` varchar(36) NOT NULL,
  `broker_id` varchar(36) NOT NULL,
  `market_supply_id` varchar(36) DEFAULT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `broker_id` (`broker_id`),
  KEY `market_supply_id` (`market_supply_id`),
  KEY `invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHASE 1: STOCK ADJUSTMENTS & AUDIT
-- =====================================================

CREATE TABLE IF NOT EXISTS `stock_adjustments` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `product_id` varchar(36) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity_change` int(11) NOT NULL,
  `reason` enum('damaged','missing','found','correction','other') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_by` (`created_by`),
  KEY `product_id` (`product_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `payload` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `entity_type` (`entity_type`),
  KEY `entity_id` (`entity_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE `stock_levels`
  ADD CONSTRAINT `fk_stock_levels_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stock_levels_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE;

ALTER TABLE `sales_orders`
  ADD CONSTRAINT `fk_sales_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sales_orders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT;

ALTER TABLE `sales_order_items`
  ADD CONSTRAINT `fk_sales_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sales_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT;

ALTER TABLE `challans`
  ADD CONSTRAINT `fk_challans_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_challans_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_challans_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

ALTER TABLE `challan_items`
  ADD CONSTRAINT `fk_challan_items_challan` FOREIGN KEY (`challan_id`) REFERENCES `challans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_challan_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT;

ALTER TABLE `customer_returns`
  ADD CONSTRAINT `fk_customer_returns_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_customer_returns_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT;

ALTER TABLE `customer_return_items`
  ADD CONSTRAINT `fk_customer_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `customer_returns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_customer_return_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT;

ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL;

ALTER TABLE `restock_transactions`
  ADD CONSTRAINT `fk_restock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_restock_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

ALTER TABLE `market_supply`
  ADD CONSTRAINT `fk_market_supply_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_market_supply_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_market_supply_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

ALTER TABLE `commission_entries`
  ADD CONSTRAINT `fk_commission_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_commission_market_supply` FOREIGN KEY (`market_supply_id`) REFERENCES `market_supply` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_commission_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL;

ALTER TABLE `stock_adjustments`
  ADD CONSTRAINT `fk_stock_adjustments_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stock_adjustments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_products_user_category ON products(user_id, category_id);
CREATE INDEX idx_invoices_user_date ON invoices(user_id, created_at);
CREATE INDEX idx_restock_user_date ON restock_transactions(user_id, created_at);
CREATE INDEX idx_market_supply_user_date ON market_supply(user_id, created_at);

-- =====================================================
-- MIGRATION: Populate stock_levels from existing products
-- =====================================================
-- Run this AFTER importing if you have existing data in products table
-- INSERT INTO stock_levels (product_id, warehouse_id, quantity, reserved_quantity)
-- SELECT id, 1, stock, 0 FROM products WHERE stock > 0;

-- =====================================================
-- MIGRATION: Backfill cost_price_snapshot in invoice_items
-- =====================================================
-- Run this AFTER importing if you have existing data in invoice_items
-- UPDATE invoice_items ii
-- JOIN products p ON ii.product_id = p.id
-- SET ii.cost_price_snapshot = p.cost_price
-- WHERE ii.cost_price_snapshot IS NULL;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
