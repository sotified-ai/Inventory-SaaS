-- Migration 006: Foreign Keys and Table Updates
-- Adds foreign keys to existing tables and updates for Phase 1 integration
-- Run this after 005_stock_adjustments_and_audit.sql

-- Add supplier_id to restock_transactions
ALTER TABLE restock_transactions 
ADD COLUMN IF NOT EXISTS supplier_id INT AFTER user_id;

-- Add foreign key constraint for supplier_id
ALTER TABLE restock_transactions 
ADD CONSTRAINT fk_restock_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Add customer_id to invoices (optional, keeps denormalized fields for backward compatibility)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS customer_id INT AFTER user_id;

-- Add foreign key constraint for customer_id
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoice_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Add warehouse_id to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS warehouse_id INT DEFAULT 1 AFTER customer_id;

-- Add foreign key constraint for invoice warehouse_id
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoice_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT;

-- Add warehouse_id to restock_transactions
ALTER TABLE restock_transactions 
ADD COLUMN IF NOT EXISTS warehouse_id INT DEFAULT 1 AFTER supplier_id;

-- Add foreign key constraint for restock warehouse_id
ALTER TABLE restock_transactions 
ADD CONSTRAINT fk_restock_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT;

-- Update market_supply foreign keys for brokers and drivers
-- First, ensure columns are nullable INT type
ALTER TABLE market_supply 
MODIFY COLUMN broker_id INT NULL,
MODIFY COLUMN driver_id INT NULL;

-- Add foreign key constraints (check if they don't already exist)
-- Note: MySQL will error if constraint already exists, so we use a procedure
DELIMITER $$

CREATE PROCEDURE AddMarketSupplyForeignKeys()
BEGIN
    -- Check and add broker foreign key
    IF NOT EXISTS (
        SELECT NULL FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'market_supply'
        AND CONSTRAINT_NAME = 'fk_market_supply_broker'
    ) THEN
        ALTER TABLE market_supply 
        ADD CONSTRAINT fk_market_supply_broker 
        FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL;
    END IF;
    
    -- Check and add driver foreign key
    IF NOT EXISTS (
        SELECT NULL FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'market_supply'
        AND CONSTRAINT_NAME = 'fk_market_supply_driver'
    ) THEN
        ALTER TABLE market_supply 
        ADD CONSTRAINT fk_market_supply_driver 
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
END$$

DELIMITER ;

CALL AddMarketSupplyForeignKeys();
DROP PROCEDURE AddMarketSupplyForeignKeys;

-- Update auth_users to ensure role column exists with proper ENUM values
ALTER TABLE auth_users 
MODIFY COLUMN role ENUM('admin', 'stock_manager', 'sales', 'accountant', 'viewer') DEFAULT 'admin';

-- Set default role to 'admin' for existing users without a role
UPDATE auth_users SET role = 'admin' WHERE role IS NULL OR role = '';
