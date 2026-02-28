<?php
/**
 * Phase 1 Handler Functions - Part 3
 * Returns, Expenses, Price History, and Reports
 */

// ==================== CUSTOMER RETURNS ====================

function handleGetReturns($userId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT cr.*, i.invoice_number, c.name as customer_name, w.name as warehouse_name
        FROM customer_returns cr
        JOIN invoices i ON cr.invoice_id = i.id
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN warehouses w ON cr.warehouse_id = w.id
        WHERE cr.created_by = ?
        ORDER BY cr.created_at DESC
    ");
    $stmt->execute([$userId]);
    sendSuccess($stmt->fetchAll());
}

function handleGetReturn($userId, $returnId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT cr.*, i.invoice_number, c.name as customer_name, w.name as warehouse_name
        FROM customer_returns cr
        JOIN invoices i ON cr.invoice_id = i.id
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN warehouses w ON cr.warehouse_id = w.id
        WHERE cr.id = ? AND cr.created_by = ?
    ");
    $stmt->execute([$returnId, $userId]);
    $return = $stmt->fetch();
    
    if (!$return) {
        sendError(404, "Return not found");
    }
    
    // Get items
    $stmt = $pdo->prepare("
        SELECT cri.*, p.name as product_name, p.sku
        FROM customer_return_items cri
        JOIN products p ON cri.product_id = p.id
        WHERE cri.return_id = ?
    ");
    $stmt->execute([$returnId]);
    $return['items'] = $stmt->fetchAll();
    
    sendSuccess($return);
}

function handleCreateReturn($userId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['invoice_id']) || empty($input['items'])) {
        sendError(400, "Invoice ID and items are required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get invoice details
        $stmt = $pdo->prepare("SELECT warehouse_id, customer_id FROM invoices WHERE id = ? AND user_id = ?");
        $stmt->execute([$input['invoice_id'], $userId]);
        $invoice = $stmt->fetch();
        
        if (!$invoice) {
            throw new Exception("Invoice not found");
        }
        
        $returnId = generateUUID();
        $returnNumber = 'RET-' . time() . '-' . substr($returnId, 0, 8);
        $warehouseId = $invoice['warehouse_id'] ?? 1;
        
        // Create return
        $stmt = $pdo->prepare("
            INSERT INTO customer_returns (id, return_number, invoice_id, customer_id, warehouse_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $returnId,
            $returnNumber,
            $input['invoice_id'],
            $invoice['customer_id'],
            $warehouseId,
            $userId
        ]);
        
        // Process return items
        foreach ($input['items'] as $item) {
            $itemId = generateUUID();
            $condition = $item['condition'] ?? 'good';
            
            // Create return item
            $stmt = $pdo->prepare("
                INSERT INTO customer_return_items (id, return_id, product_id, quantity, condition, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $itemId,
                $returnId,
                $item['product_id'],
                $item['quantity'],
                $condition,
                $item['notes'] ?? null
            ]);
            
            // Handle stock based on condition
            if ($condition === 'good') {
                // Return to stock
                updateStockLevel($pdo, $item['product_id'], $warehouseId, $item['quantity']);
            } else if ($condition === 'damaged') {
                // Create stock adjustment for damaged items
                $adjustmentId = generateUUID();
                $stmt = $pdo->prepare("
                    INSERT INTO stock_adjustments (id, product_id, warehouse_id, quantity_change, reason, notes, created_by, created_at)
                    VALUES (?, ?, ?, ?, 'damaged', ?, ?, NOW())
                ");
                $stmt->execute([
                    $adjustmentId,
                    $item['product_id'],
                    $warehouseId,
                    0, // Don't add back to stock
                    'Damaged return: ' . ($item['notes'] ?? ''),
                    $userId
                ]);
            }
        }
        
        logAudit($pdo, $userId, 'customer_return', $returnId, 'create', $input);
        $pdo->commit();
        
        sendSuccess(['message' => 'Return processed', 'return_id' => $returnId, 'return_number' => $returnNumber], 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

// ==================== EXPENSES ====================

function handleGetExpenses($userId, $params) {
    $pdo = getDBConnection();
    
    $query = "SELECT * FROM expenses WHERE created_by = ?";
    $queryParams = [$userId];
    
    if (!empty($params['category'])) {
        $query .= " AND category = ?";
        $queryParams[] = $params['category'];
    }
    
    if (!empty($params['date_from'])) {
        $query .= " AND created_at >= ?";
        $queryParams[] = $params['date_from'];
    }
    
    if (!empty($params['date_to'])) {
        $query .= " AND created_at <= ?";
        $queryParams[] = $params['date_to'];
    }
    
    $query .= " ORDER BY created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    
    sendSuccess($stmt->fetchAll());
}

function handleCreateExpense($userId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['category']) || empty($input['amount'])) {
        sendError(400, "Category and amount are required");
    }
    
    try {
        $expenseId = generateUUID();
        
        $stmt = $pdo->prepare("
            INSERT INTO expenses (id, category, description, amount, related_invoice_id, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, NOW(), ?)
        ");
        $stmt->execute([
            $expenseId,
            $input['category'],
            $input['description'] ?? null,
            $input['amount'],
            $input['related_invoice_id'] ?? null,
            $userId
        ]);
        
        logAudit($pdo, $userId, 'expense', $expenseId, 'create', $input);
        
        sendSuccess(['message' => 'Expense created', 'expense_id' => $expenseId], 201);
        
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleDeleteExpense($userId, $expenseId) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ? AND created_by = ?");
        $stmt->execute([$expenseId, $userId]);
        
        logAudit($pdo, $userId, 'expense', $expenseId, 'delete');
        sendSuccess(['message' => 'Expense deleted']);
        
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

// ==================== PRICE HISTORY ====================

function handleGetPriceHistory($userId, $productId) {
    $pdo = getDBConnection();
    
    // Verify product belongs to user
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$productId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Product not found");
    }
    
    $stmt = $pdo->prepare("
        SELECT * FROM price_history 
        WHERE product_id = ? 
        ORDER BY changed_at DESC
    ");
    $stmt->execute([$productId]);
    
    sendSuccess($stmt->fetchAll());
}

// ==================== REPORTS ====================

function handleStockMovementReport($userId, $params) {
    $pdo = getDBConnection();
    
    $productId = $params['product_id'] ?? null;
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    
    $movements = [];
    
    // Restock movements
    $query = "
        SELECT 'restock' as type, rt.restock_timestamp as date, ri.product_id, p.name as product_name,
               ri.quantity as quantity, w.name as warehouse_name, rt.restock_number as reference
        FROM restock_items ri
        JOIN restock_transactions rt ON ri.restock_id = rt.id
        JOIN products p ON ri.product_id = p.id
        LEFT JOIN warehouses w ON rt.warehouse_id = w.id
        WHERE rt.user_id = ?
    ";
    $queryParams = [$userId];
    
    if ($productId) {
        $query .= " AND ri.product_id = ?";
        $queryParams[] = $productId;
    }
    
    $query .= " AND rt.restock_timestamp >= ? AND rt.restock_timestamp <= ?";
    $queryParams[] = $dateFrom;
    $queryParams[] = $dateTo;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $movements = array_merge($movements, $stmt->fetchAll());
    
    // Sales movements
    $query = "
        SELECT 'sale' as type, i.sale_timestamp as date, ii.product_id, ii.product_name,
               -(ii.quantity + COALESCE(ii.bonus_quantity, 0)) as quantity, 
               w.name as warehouse_name, i.invoice_number as reference
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        LEFT JOIN warehouses w ON i.warehouse_id = w.id
        WHERE i.user_id = ? AND i.is_deleted = 0
    ";
    $queryParams = [$userId];
    
    if ($productId) {
        $query .= " AND ii.product_id = ?";
        $queryParams[] = $productId;
    }
    
    $query .= " AND i.sale_timestamp >= ? AND i.sale_timestamp <= ?";
    $queryParams[] = $dateFrom;
    $queryParams[] = $dateTo;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $movements = array_merge($movements, $stmt->fetchAll());
    
    // Stock adjustments
    $query = "
        SELECT 'adjustment' as type, sa.created_at as date, sa.product_id, p.name as product_name,
               sa.quantity_change as quantity, w.name as warehouse_name, sa.reason as reference
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        JOIN warehouses w ON sa.warehouse_id = w.id
        WHERE sa.created_by = ?
    ";
    $queryParams = [$userId];
    
    if ($productId) {
        $query .= " AND sa.product_id = ?";
        $queryParams[] = $productId;
    }
    
    $query .= " AND sa.created_at >= ? AND sa.created_at <= ?";
    $queryParams[] = $dateFrom;
    $queryParams[] = $dateTo;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $movements = array_merge($movements, $stmt->fetchAll());
    
    // Sort by date
    usort($movements, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });
    
    sendSuccess($movements);
}

function handleWarehouseStockReport($userId, $params) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT w.id as warehouse_id, w.name as warehouse_name,
               p.id as product_id, p.name as product_name, p.sku,
               COALESCE(sl.quantity, 0) as quantity,
               COALESCE(sl.reserved_quantity, 0) as reserved_quantity,
               p.min_stock, p.selling_price, p.cost_price
        FROM warehouses w
        CROSS JOIN products p
        LEFT JOIN stock_levels sl ON p.id = sl.product_id AND w.id = sl.warehouse_id
        WHERE p.user_id = ?
        ORDER BY w.name, p.name
    ");
    $stmt->execute([$userId]);
    
    sendSuccess($stmt->fetchAll());
}

function handleExpenseReport($userId, $params) {
    $pdo = getDBConnection();
    
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    
    $stmt = $pdo->prepare("
        SELECT category, SUM(amount) as total_amount, COUNT(*) as count
        FROM expenses
        WHERE created_by = ? AND created_at >= ? AND created_at <= ?
        GROUP BY category
        ORDER BY total_amount DESC
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    $summary = $stmt->fetchAll();
    
    $stmt = $pdo->prepare("
        SELECT * FROM expenses
        WHERE created_by = ? AND created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    $details = $stmt->fetchAll();
    
    $totalExpenses = array_sum(array_column($summary, 'total_amount'));
    
    sendSuccess([
        'summary' => $summary,
        'details' => $details,
        'total_expenses' => $totalExpenses,
        'date_from' => $dateFrom,
        'date_to' => $dateTo
    ]);
}

function handleCommissionReport($userId, $params) {
    $pdo = getDBConnection();
    
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    
    // Note: Commission calculation would need to be implemented when invoices are created
    // For now, return placeholder data
    $stmt = $pdo->prepare("
        SELECT b.id as broker_id, b.name as broker_name, 
               COUNT(DISTINCT i.id) as invoice_count,
               SUM(i.final_total_amount) as total_sales,
               b.commission_type, b.commission_value
        FROM invoices i
        JOIN market_supply ms ON i.id = ms.id
        JOIN brokers b ON ms.broker_id = b.id
        WHERE i.user_id = ? AND i.sale_timestamp >= ? AND i.sale_timestamp <= ?
        GROUP BY b.id, b.name, b.commission_type, b.commission_value
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    
    sendSuccess($stmt->fetchAll());
}

function handleChallanReport($userId, $params) {
    $pdo = getDBConnection();
    
    $status = $params['status'] ?? null;
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    
    $query = "
        SELECT c.*, i.invoice_number, i.customer_name, d.name as driver_name
        FROM challans c
        JOIN invoices i ON c.invoice_id = i.id
        LEFT JOIN drivers d ON c.driver_id = d.id
        WHERE i.user_id = ? AND c.created_at >= ? AND c.created_at <= ?
    ";
    $queryParams = [$userId, $dateFrom, $dateTo];
    
    if ($status) {
        $query .= " AND c.status = ?";
        $queryParams[] = $status;
    }
    
    $query .= " ORDER BY c.created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    
    sendSuccess($stmt->fetchAll());
}

function handlePnLReport($userId, $params) {
    $pdo = getDBConnection();
    
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    
    // Revenue (from invoices)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(final_total_amount), 0) as revenue
        FROM invoices
        WHERE user_id = ? AND is_deleted = 0 
        AND sale_timestamp >= ? AND sale_timestamp <= ?
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    $revenue = $stmt->fetch()['revenue'];
    
    // COGS (from invoice_items with cost_price_snapshot)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) as cogs
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE i.user_id = ? AND i.is_deleted = 0
        AND i.sale_timestamp >= ? AND i.sale_timestamp <= ?
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    $cogs = $stmt->fetch()['cogs'];
    
    // Expenses
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(amount), 0) as expenses
        FROM expenses
        WHERE created_by = ? AND created_at >= ? AND created_at <= ?
    ");
    $stmt->execute([$userId, $dateFrom, $dateTo]);
    $expenses = $stmt->fetch()['expenses'];
    
    // Calculate profit
    $grossProfit = $revenue - $cogs;
    $netProfit = $grossProfit - $expenses;
    $grossMargin = $revenue > 0 ? ($grossProfit / $revenue) * 100 : 0;
    $netMargin = $revenue > 0 ? ($netProfit / $revenue) * 100 : 0;
    
    sendSuccess([
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'revenue' => (float)$revenue,
        'cogs' => (float)$cogs,
        'gross_profit' => (float)$grossProfit,
        'expenses' => (float)$expenses,
        'net_profit' => (float)$netProfit,
        'gross_margin_percent' => round($grossMargin, 2),
        'net_margin_percent' => round($netMargin, 2)
    ]);
}

?>
