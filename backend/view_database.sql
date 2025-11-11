-- View all tables in the inventory database
USE inventory;

-- Show all tables
SHOW TABLES;

-- View all users
SELECT * FROM users;

-- View all products
SELECT * FROM products ORDER BY created_at DESC;

-- View all invoices with customer details
SELECT 
    id,
    invoice_number,
    user_id,
    customer_name,
    customer_phone,
    customer_address,
    subtotal,
    total,
    discount_percentage,
    final_discount_amount,
    final_total_amount,
    is_deleted,
    created_at,
    sale_timestamp,
    updated_at
FROM invoices 
WHERE is_deleted = 0
ORDER BY created_at DESC;

-- View all invoice items with product details
SELECT 
    ii.id,
    ii.invoice_id,
    i.invoice_number,
    ii.product_id,
    p.name as product_name,
    ii.quantity,
    ii.unit_price,
    ii.price_per_unit,
    ii.discount,
    ii.total_price,
    ii.total_line_price,
    ii.created_at
FROM invoice_items ii
LEFT JOIN invoices i ON ii.invoice_id = i.id
LEFT JOIN products p ON ii.product_id = p.id
ORDER BY ii.created_at DESC;

-- View sales summary
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(final_total_amount) as total_revenue,
    SUM(final_discount_amount) as total_discounts
FROM invoices
WHERE is_deleted = 0
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- View product stock levels
SELECT 
    id,
    name,
    sku,
    selling_price,
    cost_price,
    current_stock,
    min_stock,
    CASE 
        WHEN current_stock <= min_stock THEN 'Low Stock'
        ELSE 'Normal'
    END as stock_status
FROM products
ORDER BY current_stock ASC;
