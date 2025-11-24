<?php
/**
 * Phase 1 Handler Functions for Easy Stock
 * This file contains all handler functions for Phase 1 features
 * Include this file in api.php before the routing section
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Log audit entry
 */
function logAudit($pdo, $userId, $entityType, $entityId, $action, $payload = null) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO audit_logs (user_id, entity_type, entity_id, action, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $payloadJson = $payload ? json_encode($payload) : null;
        $stmt->execute([$userId, $entityType, $entityId, $action, $payloadJson]);
    } catch (Exception $e) {
        // Log audit failure but don't break the main operation
        error_log("Audit log failed: " . $e->getMessage());
    }
}

/**
 * Check user permission (RBAC)
 * For now, returns true for all admin users
 * Can be extended with more granular permissions
 */
function checkPermission($username, $action) {
    // TODO: Implement granular RBAC
    // For now, all authenticated users have full access
    return true;
}

/**
 * Update stock_levels for a product in a warehouse
 */
function updateStockLevel($pdo, $productId, $warehouseId, $quantityChange) {
    // Check if stock_level exists
    $stmt = $pdo->prepare("SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ?");
    $stmt->execute([$productId, $warehouseId]);
    $stockLevel = $stmt->fetch();
    
    if ($stockLevel) {
        // Update existing stock level
        $stmt = $pdo->prepare("UPDATE stock_levels SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$quantityChange, $stockLevel['id']]);
    } else {
        // Create new stock level entry
        $stmt = $pdo->prepare("
            INSERT INTO stock_levels (product_id, warehouse_id, quantity, reserved_quantity, updated_at)
            VALUES (?, ?, ?, 0, NOW())
        ");
        $stmt->execute([$productId, $warehouseId, max(0, $quantityChange)]);
    }
    
    // Also update products.stock for backward compatibility (sum of all warehouses)
    $stmt = $pdo->prepare("
        UPDATE products p
        SET p.stock = (
            SELECT COALESCE(SUM(sl.quantity), 0)
            FROM stock_levels sl
            WHERE sl.product_id = p.id
        )
        WHERE p.id = ?
    ");
    $stmt->execute([$productId]);
}

/**
 * Get current stock level for a product in a warehouse
 */
function getStockLevel($pdo, $productId, $warehouseId) {
    $stmt = $pdo->prepare("SELECT quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ?");
    $stmt->execute([$productId, $warehouseId]);
    $result = $stmt->fetch();
    return $result ? (float)$result['quantity'] : 0;
}

// ==================== WAREHOUSES ====================

function handleGetWarehouses($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM warehouses ORDER BY name ASC");
        $stmt->execute();
        sendSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        sendError(500, "Failed to fetch warehouses: " . $e->getMessage());
    }
}

function handleGetWarehouse($userId, $warehouseId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM warehouses WHERE id = ?");
        $stmt->execute([$warehouseId]);
        $warehouse = $stmt->fetch();
        
        if (!$warehouse) {
            sendError(404, "Warehouse not found");
        }
        
        sendSuccess($warehouse);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch warehouse: " . $e->getMessage());
    }
}

function handleCreateWarehouse($userId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Warehouse name is required");
        }
        
        $stmt = $pdo->prepare("INSERT INTO warehouses (name, address, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
        $stmt->execute([
            $input['name'],
            $input['address'] ?? null
        ]);
        
        $id = $pdo->lastInsertId();
        logAudit($pdo, $userId, 'warehouse', $id, 'create', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM warehouses WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (Exception $e) {
        sendError(500, "Failed to create warehouse: " . $e->getMessage());
    }
}

function handleUpdateWarehouse($userId, $warehouseId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Warehouse name is required");
        }
        
        $stmt = $pdo->prepare("UPDATE warehouses SET name = ?, address = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['name'],
            $input['address'] ?? null,
            $warehouseId
        ]);
        
        logAudit($pdo, $userId, 'warehouse', $warehouseId, 'update', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM warehouses WHERE id = ?");
        $stmt->execute([$warehouseId]);
        sendSuccess($stmt->fetch());
    } catch (Exception $e) {
        sendError(500, "Failed to update warehouse: " . $e->getMessage());
    }
}

function handleDeleteWarehouse($userId, $warehouseId) {
    try {
        $pdo = getDBConnection();
        
        // Don't allow deleting warehouse ID 1 (main warehouse)
        if ($warehouseId == 1) {
            sendError(400, "Cannot delete the main warehouse");
        }
        
        // Check if warehouse has stock
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM stock_levels WHERE warehouse_id = ? AND quantity > 0");
        $stmt->execute([$warehouseId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete warehouse with existing stock. Transfer stock first.");
        }
        
        $stmt = $pdo->prepare("DELETE FROM warehouses WHERE id = ?");
        $stmt->execute([$warehouseId]);
        
        logAudit($pdo, $userId, 'warehouse', $warehouseId, 'delete');
        sendSuccess(['message' => 'Warehouse deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete warehouse: " . $e->getMessage());
    }
}

// ==================== SUPPLIERS ====================

function handleGetSuppliers($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM suppliers ORDER BY name ASC");
        $stmt->execute();
        sendSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        sendError(500, "Failed to fetch suppliers: " . $e->getMessage());
    }
}

function handleGetSupplier($userId, $supplierId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
        $stmt->execute([$supplierId]);
        $supplier = $stmt->fetch();
        
        if (!$supplier) {
            sendError(404, "Supplier not found");
        }
        
        sendSuccess($supplier);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch supplier: " . $e->getMessage());
    }
}

function handleCreateSupplier($userId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name']) || empty($input['supplier_code'])) {
            sendError(400, "Supplier name and code are required");
        }
        
        $stmt = $pdo->prepare("INSERT INTO suppliers (supplier_code, name, phone, email, address, payment_terms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $input['supplier_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['payment_terms'] ?? null
        ]);
        
        $id = $pdo->lastInsertId();
        logAudit($pdo, $userId, 'supplier', $id, 'create', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (Exception $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Supplier code already exists");
        }
        sendError(500, "Failed to create supplier: " . $e->getMessage());
    }
}

function handleUpdateSupplier($userId, $supplierId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name']) || empty($input['supplier_code'])) {
            sendError(400, "Supplier name and code are required");
        }
        
        $stmt = $pdo->prepare("UPDATE suppliers SET supplier_code = ?, name = ?, phone = ?, email = ?, address = ?, payment_terms = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['supplier_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['payment_terms'] ?? null,
            $supplierId
        ]);
        
        logAudit($pdo, $userId, 'supplier', $supplierId, 'update', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
        $stmt->execute([$supplierId]);
        sendSuccess($stmt->fetch());
    } catch (Exception $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Supplier code already exists");
        }
        sendError(500, "Failed to update supplier: " . $e->getMessage());
    }
}

function handleDeleteSupplier($userId, $supplierId) {
    try {
        $pdo = getDBConnection();
        
        // Check if supplier is used in restock transactions
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM restock_transactions WHERE supplier_id = ?");
        $stmt->execute([$supplierId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete supplier with existing restock transactions");
        }
        
        $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ?");
        $stmt->execute([$supplierId]);
        
        logAudit($pdo, $userId, 'supplier', $supplierId, 'delete');
        sendSuccess(['message' => 'Supplier deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete supplier: " . $e->getMessage());
    }
}

// ==================== CUSTOMERS ====================

function handleGetCustomers($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM customers ORDER BY name ASC");
        $stmt->execute();
        sendSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        sendError(500, "Failed to fetch customers: " . $e->getMessage());
    }
}

function handleGetCustomer($userId, $customerId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();
        
        if (!$customer) {
            sendError(404, "Customer not found");
        }
        
        sendSuccess($customer);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch customer: " . $e->getMessage());
    }
}

function handleCreateCustomer($userId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name']) || empty($input['customer_code'])) {
            sendError(400, "Customer name and code are required");
        }
        
        $stmt = $pdo->prepare("INSERT INTO customers (customer_code, name, phone, email, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $input['customer_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null
        ]);
        
        $id = $pdo->lastInsertId();
        logAudit($pdo, $userId, 'customer', $id, 'create', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (Exception $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Customer code already exists");
        }
        sendError(500, "Failed to create customer: " . $e->getMessage());
    }
}

function handleUpdateCustomer($userId, $customerId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name']) || empty($input['customer_code'])) {
            sendError(400, "Customer name and code are required");
        }
        
        $stmt = $pdo->prepare("UPDATE customers SET customer_code = ?, name = ?, phone = ?, email = ?, address = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['customer_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $customerId
        ]);
        
        logAudit($pdo, $userId, 'customer', $customerId, 'update', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        sendSuccess($stmt->fetch());
    } catch (Exception $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Customer code already exists");
        }
        sendError(500, "Failed to update customer: " . $e->getMessage());
    }
}

function handleDeleteCustomer($userId, $customerId) {
    try {
        $pdo = getDBConnection();
        
        // Check if customer is used in sales transactions
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM sales WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete customer with existing sales transactions");
        }
        
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        
        logAudit($pdo, $userId, 'customer', $customerId, 'delete');
        sendSuccess(['message' => 'Customer deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete customer: " . $e->getMessage());
    }
}

// ==================== BROKERS ====================

function handleGetBrokers($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM brokers ORDER BY name ASC");
        $stmt->execute();
        sendSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        sendError(500, "Failed to fetch brokers: " . $e->getMessage());
    }
}

function handleGetBroker($userId, $brokerId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM brokers WHERE id = ?");
        $stmt->execute([$brokerId]);
        $broker = $stmt->fetch();
        
        if (!$broker) {
            sendError(404, "Broker not found");
        }
        
        sendSuccess($broker);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch broker: " . $e->getMessage());
    }
}

function handleCreateBroker($userId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Broker name is required");
        }
        
        $stmt = $pdo->prepare("INSERT INTO brokers (name, phone, email, address, commission_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['commission_rate'] ?? 0
        ]);
        
        $id = $pdo->lastInsertId();
        logAudit($pdo, $userId, 'broker', $id, 'create', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM brokers WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (Exception $e) {
        sendError(500, "Failed to create broker: " . $e->getMessage());
    }
}

function handleUpdateBroker($userId, $brokerId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Broker name is required");
        }
        
        $stmt = $pdo->prepare("UPDATE brokers SET name = ?, phone = ?, email = ?, address = ?, commission_rate = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['commission_rate'] ?? 0,
            $brokerId
        ]);
        
        logAudit($pdo, $userId, 'broker', $brokerId, 'update', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM brokers WHERE id = ?");
        $stmt->execute([$brokerId]);
        sendSuccess($stmt->fetch());
    } catch (Exception $e) {
        sendError(500, "Failed to update broker: " . $e->getMessage());
    }
}

function handleDeleteBroker($userId, $brokerId) {
    try {
        $pdo = getDBConnection();
        
        // Check if broker is used in sales transactions
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM sales WHERE broker_id = ?");
        $stmt->execute([$brokerId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete broker with existing sales transactions");
        }
        
        $stmt = $pdo->prepare("DELETE FROM brokers WHERE id = ?");
        $stmt->execute([$brokerId]);
        
        logAudit($pdo, $userId, 'broker', $brokerId, 'delete');
        sendSuccess(['message' => 'Broker deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete broker: " . $e->getMessage());
    }
}

// ==================== DRIVERS ====================

function handleGetDrivers($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM drivers ORDER BY name ASC");
        $stmt->execute();
        sendSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        sendError(500, "Failed to fetch drivers: " . $e->getMessage());
    }
}

function handleGetDriver($userId, $driverId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->execute([$driverId]);
        $driver = $stmt->fetch();
        
        if (!$driver) {
            sendError(404, "Driver not found");
        }
        
        sendSuccess($driver);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch driver: " . $e->getMessage());
    }
}

function handleCreateDriver($userId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Driver name is required");
        }
        
        $stmt = $pdo->prepare("INSERT INTO drivers (name, phone, license_number, vehicle_number, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $input['name'],
            $input['phone'] ?? null,
            $input['license_number'] ?? null,
            $input['vehicle_number'] ?? null
        ]);
        
        $id = $pdo->lastInsertId();
        logAudit($pdo, $userId, 'driver', $id, 'create', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (Exception $e) {
        sendError(500, "Failed to create driver: " . $e->getMessage());
    }
}

function handleUpdateDriver($userId, $driverId, $input) {
    try {
        $pdo = getDBConnection();
        
        if (empty($input['name'])) {
            sendError(400, "Driver name is required");
        }
        
        $stmt = $pdo->prepare("UPDATE drivers SET name = ?, phone = ?, license_number = ?, vehicle_number = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['name'],
            $input['phone'] ?? null,
            $input['license_number'] ?? null,
            $input['vehicle_number'] ?? null,
            $driverId
        ]);
        
        logAudit($pdo, $userId, 'driver', $driverId, 'update', $input);
        
        $stmt = $pdo->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->execute([$driverId]);
        sendSuccess($stmt->fetch());
    } catch (Exception $e) {
        sendError(500, "Failed to update driver: " . $e->getMessage());
    }
}

function handleDeleteDriver($userId, $driverId) {
    try {
        $pdo = getDBConnection();
        
        // Check if driver is used in challans
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM challans WHERE driver_id = ?");
        $stmt->execute([$driverId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete driver with existing challans");
        }
        
        $stmt = $pdo->prepare("DELETE FROM drivers WHERE id = ?");
        $stmt->execute([$driverId]);
        
        logAudit($pdo, $userId, 'driver', $driverId, 'delete');
        sendSuccess(['message' => 'Driver deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete driver: " . $e->getMessage());
    }
}

// File continues in next part due to size...
?>
