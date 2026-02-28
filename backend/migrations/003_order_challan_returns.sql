-- Migration 003: Order, Challan, and Returns Tables
-- Creates sales orders, challans, and customer returns infrastructure
-- Run this after 002_master_data_tables.sql

-- Sales Orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INT,
    warehouse_id INT NOT NULL,
    status ENUM('draft', 'confirmed', 'invoiced', 'cancelled') DEFAULT 'draft',
    created_by VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Order Items table
CREATE TABLE IF NOT EXISTS sales_order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    bonus_quantity DECIMAL(18,4) DEFAULT 0,
    discount DECIMAL(18,4) DEFAULT 0,
    price_per_unit DECIMAL(18,4) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Challans (Delivery Notes) table
CREATE TABLE IF NOT EXISTS challans (
    id VARCHAR(36) PRIMARY KEY,
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    driver_id INT,
    status ENUM('draft', 'dispatched', 'delivered', 'returned') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    INDEX idx_challan_number (challan_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Challan Items table
CREATE TABLE IF NOT EXISTS challan_items (
    id VARCHAR(36) PRIMARY KEY,
    challan_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    FOREIGN KEY (challan_id) REFERENCES challans(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_challan (challan_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Returns table
CREATE TABLE IF NOT EXISTS customer_returns (
    id VARCHAR(36) PRIMARY KEY,
    return_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    customer_id INT,
    warehouse_id INT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    INDEX idx_return_number (return_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Return Items table
CREATE TABLE IF NOT EXISTS customer_return_items (
    id VARCHAR(36) PRIMARY KEY,
    return_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    condition ENUM('good', 'damaged') DEFAULT 'good',
    notes TEXT,
    FOREIGN KEY (return_id) REFERENCES customer_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_return (return_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
