-- Migration 004: Financial Integrity
-- Adds cost tracking, price history, expenses, and commission tables
-- Run this after 003_order_challan_returns.sql

-- Add cost_price_snapshot to invoice_items for accurate COGS tracking
-- First add as nullable to allow backfill
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS cost_price_snapshot DECIMAL(18,4) DEFAULT 0 AFTER unit_price;

-- Backfill cost_price_snapshot from current product cost_price
UPDATE invoice_items ii
JOIN products p ON ii.product_id = p.id
SET ii.cost_price_snapshot = p.cost_price
WHERE ii.cost_price_snapshot = 0 OR ii.cost_price_snapshot IS NULL;

-- Make cost_price_snapshot NOT NULL after backfill
ALTER TABLE invoice_items 
MODIFY COLUMN cost_price_snapshot DECIMAL(18,4) NOT NULL;

-- Price History table - tracks all price changes
CREATE TABLE IF NOT EXISTS price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    old_cost_price DECIMAL(18,4),
    new_cost_price DECIMAL(18,4),
    old_selling_price DECIMAL(18,4),
    new_selling_price DECIMAL(18,4),
    changed_by VARCHAR(255) NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table - tracks business expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(18,2) NOT NULL,
    related_invoice_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commission Entries table - tracks broker commissions
CREATE TABLE IF NOT EXISTS commission_entries (
    id VARCHAR(36) PRIMARY KEY,
    broker_id INT NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE RESTRICT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_broker (broker_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
