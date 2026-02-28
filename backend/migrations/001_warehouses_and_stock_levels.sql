-- Migration 001: Warehouses and Stock Levels
-- Creates multi-warehouse infrastructure and migrates existing stock data
-- Run this migration first

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_levels table (per product per warehouse)
CREATE TABLE IF NOT EXISTS stock_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    warehouse_id INT NOT NULL,
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_product_warehouse (product_id, warehouse_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    INDEX idx_product (product_id),
    INDEX idx_warehouse (warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default "Main Warehouse"
INSERT INTO warehouses (id, name, address) 
VALUES (1, 'Main Warehouse', 'Default Location')
ON DUPLICATE KEY UPDATE name = name;

-- Migrate existing stock from products table to stock_levels
-- Only migrate products with stock > 0 to avoid unnecessary records
INSERT INTO stock_levels (product_id, warehouse_id, quantity)
SELECT id, 1, stock 
FROM products 
WHERE stock > 0
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- Note: products.stock column is kept for backward compatibility
-- It will be maintained as a computed/aggregate field in application logic
