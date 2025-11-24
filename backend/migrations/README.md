# Database Migrations for Easy Stock Phase 1

This directory contains SQL migration scripts for Phase 1 enhancements to the Easy Stock system.

## Migration Order

**IMPORTANT**: Run these migrations in numerical order. Each migration depends on the previous ones.

1. `001_warehouses_and_stock_levels.sql` - Creates warehouses and stock_levels tables, migrates existing stock
2. `002_master_data_tables.sql` - Creates suppliers, customers, brokers, and drivers tables
3. `003_order_challan_returns.sql` - Creates sales orders, challans, and returns tables
4. `004_financial_integrity.sql` - Adds COGS tracking, price history, expenses, and commissions
5. `005_stock_adjustments_and_audit.sql` - Creates stock adjustments and audit log tables
6. `006_foreign_keys_and_updates.sql` - Adds foreign keys and updates existing tables

## Running Migrations

### Using MySQL Command Line

```bash
# Navigate to the migrations directory
cd backend/migrations

# Run each migration in order
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 001_warehouses_and_stock_levels.sql
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 002_master_data_tables.sql
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 003_order_challan_returns.sql
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 004_financial_integrity.sql
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 005_stock_adjustments_and_audit.sql
mysql -u realgiveaways_inventory -p realgiveaways_inventory < 006_foreign_keys_and_updates.sql
```

### Using phpMyAdmin or Similar Tool

1. Open your database management tool
2. Select the `realgiveaways_inventory` database
3. Import each SQL file in numerical order
4. Verify each migration completes successfully before proceeding to the next

## Verification

After running all migrations, verify the setup:

```sql
-- Check that all new tables were created
SHOW TABLES;

-- Verify stock migration
SELECT COUNT(*) as stock_level_count FROM stock_levels;
SELECT SUM(quantity) as total_stock_in_levels FROM stock_levels;
SELECT SUM(stock) as total_stock_in_products FROM products;
-- The sums should match

-- Verify default warehouse exists
SELECT * FROM warehouses WHERE id = 1;

-- Check foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'realgiveaways_inventory'
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;
```

## Rollback (if needed)

If you need to rollback migrations, drop tables in reverse order:

```sql
-- WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS stock_adjustments;
DROP TABLE IF EXISTS commission_entries;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS customer_return_items;
DROP TABLE IF EXISTS customer_returns;
DROP TABLE IF EXISTS challan_items;
DROP TABLE IF EXISTS challans;
DROP TABLE IF EXISTS sales_order_items;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS stock_levels;

-- Remove added columns from existing tables
ALTER TABLE restock_transactions DROP FOREIGN KEY IF EXISTS fk_restock_supplier;
ALTER TABLE restock_transactions DROP FOREIGN KEY IF EXISTS fk_restock_warehouse;
ALTER TABLE restock_transactions DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE restock_transactions DROP COLUMN IF EXISTS warehouse_id;

ALTER TABLE invoices DROP FOREIGN KEY IF EXISTS fk_invoice_customer;
ALTER TABLE invoices DROP FOREIGN KEY IF EXISTS fk_invoice_warehouse;
ALTER TABLE invoices DROP COLUMN IF EXISTS customer_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS warehouse_id;

ALTER TABLE invoice_items DROP COLUMN IF EXISTS cost_price_snapshot;

ALTER TABLE market_supply DROP FOREIGN KEY IF EXISTS fk_market_supply_broker;
ALTER TABLE market_supply DROP FOREIGN KEY IF EXISTS fk_market_supply_driver;

-- Drop master data tables
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS brokers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS warehouses;
```

## Notes

- **Backup First**: Always backup your database before running migrations
- **Test Environment**: Test migrations on a copy of your database first
- **Existing Data**: Migration 001 will migrate existing product stock to the new stock_levels table
- **Backward Compatibility**: The `products.stock` column is kept for backward compatibility
- **Default Warehouse**: A default warehouse (ID=1, "Main Warehouse") is created automatically
- **Foreign Keys**: Some migrations add foreign keys to existing tables - ensure referenced data exists
