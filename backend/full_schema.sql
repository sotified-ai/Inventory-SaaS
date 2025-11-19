-- Inventory SaaS schema (includes auth/login and all core tables)
-- Import this into your MySQL database on cPanel

-- Authentication: auth_users
CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','staff') DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default admin: username 'admin', password 'admin123' (SHA-256)
INSERT IGNORE INTO `auth_users` (`username`, `password_hash`, `role`)
VALUES ('admin', SHA2('admin123', 256), 'admin');

-- Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_category_per_user` (`user_id`, `name`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `selling_price` DECIMAL(10,2) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 0,
  `category_id` INT NULL,
  `packing_unit` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(36) NOT NULL,
  `invoice_number` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `customer_name` VARCHAR(255) NULL,
  `customer_phone` VARCHAR(50) NULL,
  `customer_address` VARCHAR(500) NULL,
  `deliveryman_name` VARCHAR(255) NULL,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_percentage` FLOAT NULL DEFAULT 0,
  `final_discount_amount` DECIMAL(10,2) NULL DEFAULT 0.00,
  `final_total_amount` DECIMAL(10,2) NULL DEFAULT 0.00,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `sale_timestamp` DATETIME NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_invoice_number` (`invoice_number`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_sale_timestamp` (`sale_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `invoice_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `price_per_unit` DECIMAL(10,2) NULL DEFAULT 0.00,
  `discount` FLOAT NULL DEFAULT 0.0,
  `bonus_quantity` INT NOT NULL DEFAULT 0,
  `returned_quantity` INT NOT NULL DEFAULT 0,
  `total` DECIMAL(10,2) NULL DEFAULT 0.00,
  `total_line_price` DECIMAL(10,2) NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_invoice_id` (`invoice_id`),
  INDEX `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restock Transactions (Soft delete enabled)
CREATE TABLE IF NOT EXISTS `restock_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `restock_number` VARCHAR(50) NOT NULL,
  `restock_timestamp` DATETIME NOT NULL,
  `total_restock_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_items_restocked` INT NOT NULL DEFAULT 0,
  `booker_name` VARCHAR(255) DEFAULT NULL,
  `deliveryman_name` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_restock_number` (`restock_number`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_restock_timestamp` (`restock_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restock Items
CREATE TABLE IF NOT EXISTS `restock_items` (
  `id` VARCHAR(36) NOT NULL,
  `restock_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `packing_unit` VARCHAR(50) DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `cost_per_unit` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_restock_id` (`restock_id`),
  INDEX `idx_product_id` (`product_id`),
  CONSTRAINT `fk_restock_items_restock_id` FOREIGN KEY (`restock_id`) REFERENCES `restock_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market Supply
CREATE TABLE IF NOT EXISTS `market_supply` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `supply_number` VARCHAR(255) NOT NULL,
  `supply_timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_quantity_pieces` INT NOT NULL DEFAULT 0,
  `total_cartons` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  UNIQUE KEY `uniq_supply_number` (`supply_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market Supply Items
CREATE TABLE IF NOT EXISTS `market_supply_items` (
  `id` VARCHAR(36) NOT NULL,
  `supply_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `return_quantity` INT NOT NULL DEFAULT 0,
  `total_cartons` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_supply_id` (`supply_id`),
  INDEX `idx_product_id` (`product_id`),
  CONSTRAINT `fk_market_supply_items_supply_id` FOREIGN KEY (`supply_id`) REFERENCES `market_supply` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: add foreign keys from products.category_id to categories.id
-- ALTER TABLE `products` ADD CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;