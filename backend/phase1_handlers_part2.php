<?php
/**
 * Phase 1 Handler Functions - Part 2
 * Orders, Challans, Returns, Stock Adjustments, Expenses, and Reports
 */

// ==================== SALES ORDERS ====================

function handleGetOrders($userId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT so.*, c.name as customer_name, w.name as warehouse_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN warehouses w ON so.warehouse_id = w.id
        WHERE so.created_by = ?
        ORDER BY so.created_at DESC
    ");
    $stmt->execute([$userId]);
    $orders = $stmt->fetchAll();
    
    // Attach items to each order
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare("
            SELECT soi.*, p.name as product_name, p.sku
            FROM sales_order_items soi
            JOIN products p ON soi.product_id = p.id
            WHERE soi.order_id = ?
        ");
        $stmt->execute([$order['id']]);
        $order['items'] = $stmt->fetchAll();
    }
    
    sendSuccess($orders);
}

function handleGetOrder($userId, $orderId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT so.*, c.name as customer_name, w.name as warehouse_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN warehouses w ON so.warehouse_id = w.id
        WHERE so.id = ? AND so.created_by = ?
    ");
    $stmt->execute([$orderId, $userId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        sendError(404, "Order not found");
    }
    
    // Attach items
    $stmt = $pdo->prepare("
        SELECT soi.*, p.name as product_name, p.sku
        FROM sales_order_items soi
        JOIN products p ON soi.product_id = p.id
        WHERE soi.order_id = ?
    ");
    $stmt->execute([$orderId]);
    $order['items'] = $stmt->fetchAll();
    
    sendSuccess($order);
}

function handleCreateOrder($userId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['items'])) {
        sendError(400, "Order must have at least one item");
    }
    
    try {
        $pdo->beginTransaction();
        
        $orderId = generateUUID();
        $orderNumber = 'ORD-' . time() . '-' . substr($orderId, 0, 8);
        $warehouseId = $input['warehouse_id'] ?? 1;
        
        // Create order
        $stmt = $pdo->prepare("
            INSERT INTO sales_orders (id, order_number, customer_id, warehouse_id, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'draft', ?, NOW(), NOW())
        ");
        $stmt->execute([
            $orderId,
            $orderNumber,
            $input['customer_id'] ?? null,
            $warehouseId,
            $userId
        ]);
        
        // Create order items
        foreach ($input['items'] as $item) {
            $itemId = generateUUID();
            $stmt = $pdo->prepare("
                INSERT INTO sales_order_items (id, order_id, product_id, quantity, bonus_quantity, discount, price_per_unit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $itemId,
                $orderId,
                $item['product_id'],
                $item['quantity'],
                $item['bonus_quantity'] ?? 0,
                $item['discount'] ?? 0,
                $item['price_per_unit']
            ]);
        }
        
        logAudit($pdo, $userId, 'sales_order', $orderId, 'create', $input);
        $pdo->commit();
        
        // Return created order
        handleGetOrder($userId, $orderId);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleUpdateOrder($userId, $orderId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Check order status
        $stmt = $pdo->prepare("SELECT status FROM sales_orders WHERE id = ? AND created_by = ?");
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            throw new Exception("Order not found");
        }
        
        if ($order['status'] !== 'draft') {
            throw new Exception("Can only update draft orders");
        }
        
        // Update order
        $stmt = $pdo->prepare("
            UPDATE sales_orders 
            SET customer_id = ?, warehouse_id = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $input['customer_id'] ?? null,
            $input['warehouse_id'] ?? 1,
            $orderId
        ]);
        
        // Delete old items
        $stmt = $pdo->prepare("DELETE FROM sales_order_items WHERE order_id = ?");
        $stmt->execute([$orderId]);
        
        // Create new items
        foreach ($input['items'] as $item) {
            $itemId = generateUUID();
            $stmt = $pdo->prepare("
                INSERT INTO sales_order_items (id, order_id, product_id, quantity, bonus_quantity, discount, price_per_unit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $itemId,
                $orderId,
                $item['product_id'],
                $item['quantity'],
                $item['bonus_quantity'] ?? 0,
                $item['discount'] ?? 0,
                $item['price_per_unit']
            ]);
        }
        
        logAudit($pdo, $userId, 'sales_order', $orderId, 'update', $input);
        $pdo->commit();
        
        sendSuccess(['message' => 'Order updated']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteOrder($userId, $orderId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Check order status
        $stmt = $pdo->prepare("SELECT status FROM sales_orders WHERE id = ? AND created_by = ?");
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            throw new Exception("Order not found");
        }
        
        if ($order['status'] === 'invoiced') {
            throw new Exception("Cannot delete invoiced orders");
        }
        
        // If confirmed, release reserved stock
        if ($order['status'] === 'confirmed') {
            $stmt = $pdo->prepare("SELECT * FROM sales_order_items WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $items = $stmt->fetchAll();
            
            foreach ($items as $item) {
                $stmt = $pdo->prepare("
                    UPDATE stock_levels 
                    SET reserved_quantity = reserved_quantity - ?
                    WHERE product_id = ? AND warehouse_id = (SELECT warehouse_id FROM sales_orders WHERE id = ?)
                ");
                $stmt->execute([$item['quantity'], $item['product_id'], $orderId]);
            }
        }
        
        // Delete order (cascade will delete items)
        $stmt = $pdo->prepare("DELETE FROM sales_orders WHERE id = ?");
        $stmt->execute([$orderId]);
        
        logAudit($pdo, $userId, 'sales_order', $orderId, 'delete');
        $pdo->commit();
        
        sendSuccess(['message' => 'Order deleted']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleConfirmOrder($userId, $orderId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Get order
        $stmt = $pdo->prepare("SELECT * FROM sales_orders WHERE id = ? AND created_by = ?");
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            throw new Exception("Order not found");
        }
        
        if ($order['status'] !== 'draft') {
            throw new Exception("Order is not in draft status");
        }
        
        // Get order items
        $stmt = $pdo->prepare("SELECT * FROM sales_order_items WHERE order_id = ?");
        $stmt->execute([$orderId]);
        $items = $stmt->fetchAll();
        
        // Reserve stock for each item
        foreach ($items as $item) {
            $totalQty = $item['quantity'] + ($item['bonus_quantity'] ?? 0);
            $currentStock = getStockLevel($pdo, $item['product_id'], $order['warehouse_id']);
            
            if ($currentStock < $totalQty) {
                throw new Exception("Insufficient stock for product " . $item['product_id']);
            }
            
            // Update reserved quantity
            $stmt = $pdo->prepare("
                UPDATE stock_levels 
                SET reserved_quantity = reserved_quantity + ?
                WHERE product_id = ? AND warehouse_id = ?
            ");
            $stmt->execute([$totalQty, $item['product_id'], $order['warehouse_id']]);
        }
        
        // Update order status
        $stmt = $pdo->prepare("UPDATE sales_orders SET status = 'confirmed', updated_at = NOW() WHERE id = ?");
        $stmt->execute([$orderId]);
        
        logAudit($pdo, $userId, 'sales_order', $orderId, 'update', ['action' => 'confirm']);
        $pdo->commit();
        
        sendSuccess(['message' => 'Order confirmed']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleConvertOrderToInvoice($userId, $orderId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Get order
        $stmt = $pdo->prepare("SELECT * FROM sales_orders WHERE id = ? AND created_by = ?");
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            throw new Exception("Order not found");
        }
        
        if ($order['status'] !== 'confirmed') {
            throw new Exception("Order must be confirmed before converting to invoice");
        }
        
        // Get order items with product details
        $stmt = $pdo->prepare("
            SELECT soi.*, p.name as product_name, p.sku, p.cost_price
            FROM sales_order_items soi
            JOIN products p ON soi.product_id = p.id
            WHERE soi.order_id = ?
        ");
        $stmt->execute([$orderId]);
        $orderItems = $stmt->fetchAll();
        
        // Create invoice
        $invoiceId = generateUUID();
        $invoiceNumber = 'INV-' . time() . '-' . substr($invoiceId, 0, 8);
        
        // Calculate totals
        $subtotal = 0;
        foreach ($orderItems as $item) {
            $lineTotal = ($item['quantity'] * $item['price_per_unit']) - ($item['discount'] ?? 0);
            $subtotal += $lineTotal;
        }
        
        // Get customer info if exists
        $customerName = 'Walk-in Customer';
        $customerPhone = null;
        $customerAddress = null;
        if ($order['customer_id']) {
            $stmt = $pdo->prepare("SELECT name, phone, address FROM customers WHERE id = ?");
            $stmt->execute([$order['customer_id']]);
            $customer = $stmt->fetch();
            if ($customer) {
                $customerName = $customer['name'];
                $customerPhone = $customer['phone'];
                $customerAddress = $customer['address'];
            }
        }
        
        // Insert invoice
        $stmt = $pdo->prepare("
            INSERT INTO invoices (id, invoice_number, user_id, customer_id, customer_name, customer_phone, customer_address,
                warehouse_id, subtotal, total, discount_percentage, final_discount_amount, final_total_amount, 
                sale_timestamp, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW(), NOW())
        ");
        $stmt->execute([
            $invoiceId,
            $invoiceNumber,
            $userId,
            $order['customer_id'],
            $customerName,
            $customerPhone,
            $customerAddress,
            $order['warehouse_id'],
            $subtotal,
            $subtotal,
            $subtotal
        ]);
        
        // Insert invoice items and update stock
        foreach ($orderItems as $item) {
            $lineTotal = ($item['quantity'] * $item['price_per_unit']) - ($item['discount'] ?? 0);
            $totalQty = $item['quantity'] + ($item['bonus_quantity'] ?? 0);
            
            // Insert invoice item with cost_price_snapshot
            $stmt = $pdo->prepare("
                INSERT INTO invoice_items (invoice_id, product_id, product_name, sku, quantity, 
                    price_per_unit, unit_price, cost_price_snapshot, discount, total_line_price, total, bonus_quantity, returned_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([
                $invoiceId,
                $item['product_id'],
                $item['product_name'],
                $item['sku'],
                $item['quantity'],
                $item['price_per_unit'],
                $item['price_per_unit'],
                $item['cost_price'],
                $item['discount'] ?? 0,
                $lineTotal,
                $lineTotal,
                $item['bonus_quantity'] ?? 0
            ]);
            
            // Update stock: reduce quantity and reserved_quantity
            $stmt = $pdo->prepare("
                UPDATE stock_levels 
                SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ?
                WHERE product_id = ? AND warehouse_id = ?
            ");
            $stmt->execute([$totalQty, $totalQty, $item['product_id'], $order['warehouse_id']]);
            
            // Update products.stock for backward compatibility
            updateStockLevel($pdo, $item['product_id'], $order['warehouse_id'], 0); // This will recalculate
        }
        
        // Update order status
        $stmt = $pdo->prepare("UPDATE sales_orders SET status = 'invoiced', updated_at = NOW() WHERE id = ?");
        $stmt->execute([$orderId]);
        
        logAudit($pdo, $userId, 'sales_order', $orderId, 'update', ['action' => 'convert_to_invoice', 'invoice_id' => $invoiceId]);
        logAudit($pdo, $userId, 'invoice', $invoiceId, 'create', ['from_order' => $orderId]);
        
        $pdo->commit();
        
        sendSuccess(['message' => 'Order converted to invoice', 'invoice_id' => $invoiceId, 'invoice_number' => $invoiceNumber]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

// ==================== STOCK ADJUSTMENTS ====================

function handleStockAdjustment($userId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['product_id']) || empty($input['warehouse_id']) || !isset($input['quantity_change'])) {
        sendError(400, "Product ID, warehouse ID, and quantity change are required");
    }
    
    if (empty($input['reason'])) {
        sendError(400, "Reason is required");
    }
    
    try {
        $pdo->beginTransaction();
        
        $adjustmentId = generateUUID();
        
        // Create adjustment record
        $stmt = $pdo->prepare("
            INSERT INTO stock_adjustments (id, product_id, warehouse_id, quantity_change, reason, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $adjustmentId,
            $input['product_id'],
            $input['warehouse_id'],
            $input['quantity_change'],
            $input['reason'],
            $input['notes'] ?? null,
            $userId
        ]);
        
        // Update stock level
        updateStockLevel($pdo, $input['product_id'], $input['warehouse_id'], $input['quantity_change']);
        
        logAudit($pdo, $userId, 'stock_adjustment', $adjustmentId, 'create', $input);
        $pdo->commit();
        
        sendSuccess(['message' => 'Stock adjusted', 'adjustment_id' => $adjustmentId], 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleGetStockAdjustments($userId, $params) {
    $pdo = getDBConnection();
    
    $query = "
        SELECT sa.*, p.name as product_name, p.sku, w.name as warehouse_name
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        JOIN warehouses w ON sa.warehouse_id = w.id
        WHERE sa.created_by = ?
    ";
    $queryParams = [$userId];
    
    if (!empty($params['product_id'])) {
        $query .= " AND sa.product_id = ?";
        $queryParams[] = $params['product_id'];
    }
    
    if (!empty($params['warehouse_id'])) {
        $query .= " AND sa.warehouse_id = ?";
        $queryParams[] = $params['warehouse_id'];
    }
    
    if (!empty($params['date_from'])) {
        $query .= " AND sa.created_at >= ?";
        $queryParams[] = $params['date_from'];
    }
    
    if (!empty($params['date_to'])) {
        $query .= " AND sa.created_at <= ?";
        $queryParams[] = $params['date_to'];
    }
    
    $query .= " ORDER BY sa.created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    
    sendSuccess($stmt->fetchAll());
}

// ==================== CHALLANS ====================

function handleGetChallans($userId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT c.*, i.invoice_number, i.customer_name, d.name as driver_name
        FROM challans c
        JOIN invoices i ON c.invoice_id = i.id
        LEFT JOIN drivers d ON c.driver_id = d.id
        WHERE i.user_id = ?
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$userId]);
    sendSuccess($stmt->fetchAll());
}

function handleGetChallan($userId, $challanId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT c.*, i.invoice_number, i.customer_name, d.name as driver_name
        FROM challans c
        JOIN invoices i ON c.invoice_id = i.id
        LEFT JOIN drivers d ON c.driver_id = d.id
        WHERE c.id = ? AND i.user_id = ?
    ");
    $stmt->execute([$challanId, $userId]);
    $challan = $stmt->fetch();
    
    if (!$challan) {
        sendError(404, "Challan not found");
    }
    
    // Get items
    $stmt = $pdo->prepare("
        SELECT ci.*, p.name as product_name, p.sku
        FROM challan_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.challan_id = ?
    ");
    $stmt->execute([$challanId]);
    $challan['items'] = $stmt->fetchAll();
    
    sendSuccess($challan);
}

function handleCreateChallan($userId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['invoice_id'])) {
        sendError(400, "Invoice ID is required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Verify invoice belongs to user
        $stmt = $pdo->prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?");
        $stmt->execute([$input['invoice_id'], $userId]);
        if (!$stmt->fetch()) {
            throw new Exception("Invoice not found");
        }
        
        $challanId = generateUUID();
        $challanNumber = 'CH-' . time() . '-' . substr($challanId, 0, 8);
        
        // Create challan
        $stmt = $pdo->prepare("
            INSERT INTO challans (id, challan_number, invoice_id, driver_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'draft', NOW(), NOW())
        ");
        $stmt->execute([
            $challanId,
            $challanNumber,
            $input['invoice_id'],
            $input['driver_id'] ?? null
        ]);
        
        // Create challan items from invoice items
        if (!empty($input['items'])) {
            foreach ($input['items'] as $item) {
                $itemId = generateUUID();
                $stmt = $pdo->prepare("
                    INSERT INTO challan_items (id, challan_id, product_id, quantity)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([
                    $itemId,
                    $challanId,
                    $item['product_id'],
                    $item['quantity']
                ]);
            }
        }
        
        logAudit($pdo, $userId, 'challan', $challanId, 'create', $input);
        $pdo->commit();
        
        sendSuccess(['message' => 'Challan created', 'challan_id' => $challanId, 'challan_number' => $challanNumber], 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleUpdateChallan($userId, $challanId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Verify challan belongs to user
        $stmt = $pdo->prepare("
            SELECT c.* FROM challans c
            JOIN invoices i ON c.invoice_id = i.id
            WHERE c.id = ? AND i.user_id = ?
        ");
        $stmt->execute([$challanId, $userId]);
        $challan = $stmt->fetch();
        
        if (!$challan) {
            throw new Exception("Challan not found");
        }
        
        if ($challan['status'] !== 'draft') {
            throw new Exception("Can only update draft challans");
        }
        
        // Update challan
        $stmt = $pdo->prepare("
            UPDATE challans 
            SET driver_id = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $input['driver_id'] ?? null,
            $challanId
        ]);
        
        logAudit($pdo, $userId, 'challan', $challanId, 'update', $input);
        $pdo->commit();
        
        sendSuccess(['message' => 'Challan updated']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteChallan($userId, $challanId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Verify challan belongs to user
        $stmt = $pdo->prepare("
            SELECT c.* FROM challans c
            JOIN invoices i ON c.invoice_id = i.id
            WHERE c.id = ? AND i.user_id = ?
        ");
        $stmt->execute([$challanId, $userId]);
        $challan = $stmt->fetch();
        
        if (!$challan) {
            throw new Exception("Challan not found");
        }
        
        if ($challan['status'] === 'delivered') {
            throw new Exception("Cannot delete delivered challans");
        }
        
        $stmt = $pdo->prepare("DELETE FROM challans WHERE id = ?");
        $stmt->execute([$challanId]);
        
        logAudit($pdo, $userId, 'challan', $challanId, 'delete');
        $pdo->commit();
        
        sendSuccess(['message' => 'Challan deleted']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleUpdateChallanStatus($userId, $challanId, $input) {
    $pdo = getDBConnection();
    
    if (empty($input['status'])) {
        sendError(400, "Status is required");
    }
    
    $validStatuses = ['draft', 'dispatched', 'delivered', 'returned'];
    if (!in_array($input['status'], $validStatuses)) {
        sendError(400, "Invalid status");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Verify challan belongs to user
        $stmt = $pdo->prepare("
            SELECT c.* FROM challans c
            JOIN invoices i ON c.invoice_id = i.id
            WHERE c.id = ? AND i.user_id = ?
        ");
        $stmt->execute([$challanId, $userId]);
        $challan = $stmt->fetch();
        
        if (!$challan) {
            throw new Exception("Challan not found");
        }
        
        // Update status
        $stmt = $pdo->prepare("UPDATE challans SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$input['status'], $challanId]);
        
        logAudit($pdo, $userId, 'challan', $challanId, 'update', ['action' => 'status_change', 'new_status' => $input['status']]);
        $pdo->commit();
        
        sendSuccess(['message' => 'Challan status updated']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

// File continues...
?>
