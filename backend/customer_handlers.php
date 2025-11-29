<?php

// ==================== CUSTOMERS ====================

function handleGetCustomers($userId) {
    try {
        $pdo = getDBConnection();
        // Aggregation for Total Invoices and Total Spent
        $sql = "
            SELECT 
                c.*,
                COUNT(i.id) as total_invoices,
                COALESCE(SUM(i.final_total_amount), 0) as total_spent
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id AND i.is_deleted = 0
            GROUP BY c.id
            ORDER BY c.name ASC
        ";
        $stmt = $pdo->prepare($sql);
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
        
        $id = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO customers (id, customer_code, name, phone, email, address, credit_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $id,
            $input['customer_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['credit_limit'] ?? 0.00
        ]);
        
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
        
        $stmt = $pdo->prepare("UPDATE customers SET customer_code = ?, name = ?, phone = ?, email = ?, address = ?, credit_limit = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $input['customer_code'],
            $input['name'],
            $input['phone'] ?? null,
            $input['email'] ?? null,
            $input['address'] ?? null,
            $input['credit_limit'] ?? 0.00,
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
        
        // Check if customer is used in invoices (sales)
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM invoices WHERE customer_id = ? AND is_deleted = 0");
        $stmt->execute([$customerId]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            sendError(400, "Cannot delete customer with existing invoices");
        }
        
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        
        logAudit($pdo, $userId, 'customer', $customerId, 'delete');
        sendSuccess(['message' => 'Customer deleted']);
    } catch (Exception $e) {
        sendError(500, "Failed to delete customer: " . $e->getMessage());
    }
}

function handleGetCustomerHistory($userId, $customerId) {
    try {
        $pdo = getDBConnection();
        
        // Verify customer exists
        $stmt = $pdo->prepare("SELECT id, name FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();
        
        if (!$customer) {
            sendError(404, "Customer not found");
        }

        // Fetch invoices for this customer
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                invoice_number, 
                sale_timestamp as date, 
                final_total_amount as amount, 
                'invoice' as type 
            FROM invoices 
            WHERE customer_id = ? AND is_deleted = 0
            ORDER BY sale_timestamp DESC
        ");
        $stmt->execute([$customerId]);
        $history = $stmt->fetchAll();
        
        sendSuccess($history);
    } catch (Exception $e) {
        sendError(500, "Failed to fetch customer history: " . $e->getMessage());
    }
}
