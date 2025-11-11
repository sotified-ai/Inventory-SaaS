<?php
// PRODUCTION UPDATE: Disable error reporting for production environments
// Enable error reporting only during development/debugging
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

// PRODUCTION UPDATE: Enhanced CORS with dynamic origin support
// IMPORTANT: CORS headers MUST be set before Content-Type
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
// PRODUCTION UPDATE: Add your domain to allowed origins using environment variable
$allowedOrigins = [
    'https://realgiveaways.com', 
    'http://realgiveaways.com'
];
if ($origin && in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Expose-Headers: Content-Length, Content-Type');
header('Access-Control-Max-Age: 86400');

header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Configuration
// PRODUCTION UPDATE: Use environment variables for database credentials
// Define default values that can be overridden by environment variables
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'realgiveaways_inventory');
define('DB_USER', getenv('DB_USER') ?: 'realgiveaways_inventory');
define('DB_PASS', getenv('DB_PASS') ?: '%x6!bSJXCc&O}0+p');
// PRODUCTION UPDATE: Change APP_SECRET for production environments
define('APP_SECRET', getenv('APP_SECRET') ?: 'inventory-saas-secret-key-change-in-production');

// Database Connection
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        sendError(500, "Database connection failed: " . $e->getMessage());
    }
}

// Authentication Helper
function authenticateRequest() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader)) {
        sendError(401, "Authorization header missing");
    }
    
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendError(401, "Invalid authorization format");
    }
    
    $token = $matches[1];
    return verifyToken($token);
}

function verifyToken($token) {
    try {
        $raw = base64_decode($token);
        $parts = explode(':', $raw);
        
        if (count($parts) !== 3) {
            throw new Exception("Invalid token format");
        }
        
        list($username, $exp, $sig_b64) = $parts;
        
        if ((int)$exp < time()) {
            throw new Exception("Token expired");
        }
        
        $payload = "$username:$exp";
        $expected_sig = base64_encode(hash_hmac('sha256', $payload, APP_SECRET, true));
        
        if (!hash_equals($sig_b64, $expected_sig)) {
            throw new Exception("Signature mismatch");
        }
        
        return $username;
    } catch (Exception $e) {
        sendError(401, "Invalid token: " . $e->getMessage());
    }
}

function generateToken($username, $expiresIn = 43200) {
    $exp = time() + $expiresIn;
    $payload = "$username:$exp";
    $sig = base64_encode(hash_hmac('sha256', $payload, APP_SECRET, true));
    $token = base64_encode("$payload:$sig");
    return $token;
}

function hashPassword($password) {
    return hash('sha256', $password);
}

function verifyUserPassword($plain, $stored) {
    // Try bcrypt verification first (for properly hashed passwords)
    if (password_verify($plain, $stored)) {
        return true;
    }
    // Fallback to SHA-256 for legacy passwords
    return hash('sha256', $plain) === $stored;
}

// Test function to verify password hashing (for debugging)
function testPasswordHash($password) {
    return hash('sha256', $password);
}

// Response Helpers
function sendSuccess($data = null, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function sendError($code, $message) {
    http_response_code($code);
    echo json_encode(['detail' => $message]);
    exit();
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Main Router
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Parse input
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Route handling
if ($requestMethod === 'POST' && (preg_match('#/api/login$#', $path) || strpos($path, '/auth/login') !== false || preg_match('#^/login$#', $path) || preg_match('#/api\.php/login$#', $path))) {
    handleLogin($input);
} elseif ($requestMethod === 'POST' && strpos($path, '/auth/register') !== false) {
    handleRegister($input);
} else {
    // All other routes require authentication
    $username = authenticateRequest();
    $userId = "mysql-$username";
    
    // Products
    if (preg_match('#/api\.php/api/products$#', $path) || preg_match('#/api/products$#', $path)) {
        if ($requestMethod === 'GET') handleGetProducts($userId);
        if ($requestMethod === 'POST') handleCreateProduct($userId, $input);
    } elseif (preg_match('#/api\.php/api/products/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/products/([a-f0-9\-]+)$#', $path, $matches)) {
        $productId = $matches[1];
        if ($requestMethod === 'PUT') handleUpdateProduct($userId, $productId, $input);
        if ($requestMethod === 'DELETE') handleDeleteProduct($userId, $productId);
    } elseif (preg_match('#/api\.php/api/products/restock$#', $path) || preg_match('#/api/products/restock$#', $path)) {
        handleRestock($userId, $input);
    }
    // Categories
    elseif (preg_match('#/api\.php/api/categories$#', $path) || preg_match('#/api/categories$#', $path)) {
        if ($requestMethod === 'GET') handleGetCategories($userId);
        if ($requestMethod === 'POST') handleCreateCategory($userId, $input);
    } elseif (preg_match('#/api\.php/api/categories/(\d+)$#', $path, $matches) || preg_match('#/api/categories/(\d+)$#', $path, $matches)) {
        $categoryId = $matches[1];
        if ($requestMethod === 'PUT') handleUpdateCategory($userId, $categoryId, $input);
        if ($requestMethod === 'DELETE') handleDeleteCategory($userId, $categoryId);
    }
    // Sales
    elseif (preg_match('#/api\.php/api/sales$#', $path) || preg_match('#/api/sales$#', $path)) {
        if ($requestMethod === 'POST') handleCreateSale($userId, $input);
    } elseif (preg_match('#/api\.php/api/sales/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/sales/([a-f0-9\-]+)$#', $path, $matches)) {
        $invoiceId = $matches[1];
        if ($requestMethod === 'PUT') handleUpdateSale($userId, $invoiceId, $input);
        if ($requestMethod === 'DELETE') handleDeleteSale($userId, $invoiceId);
    }
    // Invoices
    elseif (preg_match('#/api\.php/api/invoices$#', $path) || preg_match('#/api/invoices$#', $path)) {
        if ($requestMethod === 'GET') handleGetInvoices($userId);
    } elseif (preg_match('#/api\.php/api/invoices/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/invoices/([a-f0-9\-]+)$#', $path, $matches)) {
        $invoiceId = $matches[1];
        if ($requestMethod === 'GET') handleGetInvoice($userId, $invoiceId);
    }
    // Reports
    elseif (preg_match('#/api\.php/api/reports/sales_history#', $path) || preg_match('#/api/reports/sales_history#', $path)) {
        handleSalesHistory($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/dashboard/stats#', $path) || preg_match('#/api/dashboard/stats#', $path)) {
        handleDashboardStats($userId);
    } elseif (preg_match('#/api\.php/api/reports/itemized_sales_summary#', $path) || preg_match('#/api/reports/itemized_sales_summary#', $path)) {
        handleItemizedSales($userId, $_GET);
    }
    // Restock
    elseif (preg_match('#/api\.php/api/restock$#', $path) || preg_match('#/api/restock$#', $path)) {
        if ($requestMethod === 'POST') handleCreateRestock($userId, $input);
    } elseif (preg_match('#/api\.php/api/restock/transactions$#', $path) || preg_match('#/api/restock/transactions$#', $path)) {
        if ($requestMethod === 'GET') handleGetRestockTransactions($userId);
    } elseif (preg_match('#/api\.php/api/restock/transactions/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/restock/transactions/([a-f0-9\-]+)$#', $path, $matches)) {
        $restockId = $matches[1];
        if ($requestMethod === 'GET') handleGetRestockTransaction($userId, $restockId);
    } elseif (preg_match('#/api\.php/api/reports/combined_restock$#', $path) || preg_match('#/api/reports/combined_restock$#', $path)) {
        if ($requestMethod === 'GET') handleGetCombinedRestockReport($userId, $_GET);
    } else {
        sendError(404, "Endpoint not found");
    }
}

// ==================== AUTHENTICATION ====================

function handleLogin($input) {
    $pdo = getDBConnection();
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendError(400, "Username and password required");
    }
    
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    // Debug: Log if user was found
    if (!$user) {
        sendError(401, "User not found: " . $username);
    }
    
    if (!verifyUserPassword($password, $user['password_hash'])) {
        sendError(401, "Invalid password for user: " . $username);
    }
    
    $token = generateToken($username);
    sendSuccess([
        'token' => $token,
        'username' => $username,
        'access_token' => $token,
        'token_type' => 'bearer',
        'user_id' => "mysql-$username"
    ]);
}

function handleRegister($input) {
    $pdo = getDBConnection();
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendError(400, "Username and password required");
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO auth_users (username, password_hash) VALUES (?, ?)");
        $stmt->execute([$username, hashPassword($password)]);
        
        $token = generateToken($username);
        sendSuccess([
            'access_token' => $token,
            'token_type' => 'bearer',
            'user_id' => "mysql-$username"
        ], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Username already exists");
        }
        sendError(500, "Registration failed");
    }
}

// ==================== PRODUCTS ====================

function handleGetProducts($userId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    sendSuccess($stmt->fetchAll());
}

function handleCreateProduct($userId, $input) {
    $pdo = getDBConnection();
    $id = generateUUID();
    
    $stmt = $pdo->prepare("
        INSERT INTO products (id, user_id, name, sku, selling_price, cost_price, stock, min_stock, category_id, packing_unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $stmt->execute([
        $id,
        $userId,
        $input['name'],
        $input['sku'],
        $input['selling_price'],
        $input['cost_price'],
        $input['initial_stock'],
        $input['min_stock'],
        $input['category_id'],
        $input['packing_unit']
    ]);
    
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    sendSuccess($stmt->fetch(), 201);
}

function handleUpdateProduct($userId, $productId, $input) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        UPDATE products 
        SET name = ?, sku = ?, selling_price = ?, cost_price = ?, min_stock = ?, category_id = ?, packing_unit = ?
        WHERE id = ? AND user_id = ?
    ");
    
    $stmt->execute([
        $input['name'],
        $input['sku'],
        $input['selling_price'],
        $input['cost_price'],
        $input['min_stock'],
        $input['category_id'],
        $input['packing_unit'],
        $productId,
        $userId
    ]);
    
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$productId]);
    sendSuccess($stmt->fetch());
}

function handleDeleteProduct($userId, $productId) {
    $pdo = getDBConnection();
    
    // CRITICAL: Check if product is used in any sales transactions
    // Products cannot be deleted if they have sales history (data integrity)
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?");
    $stmt->execute([$productId]);
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
        sendError(400, "Cannot delete product. It is associated with {$result['count']} sale(s). Historical sales data must be preserved.");
    }
    
    // If no sales references, safe to delete
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$productId, $userId]);
    sendSuccess(['message' => 'Product deleted']);
}

function handleRestock($userId, $input) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$input['quantity'], $input['product_id'], $userId]);
    sendSuccess(['message' => 'Stock updated']);
}

// ==================== CATEGORIES ====================

function handleGetCategories($userId) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC");
    $stmt->execute([$userId]);
    sendSuccess($stmt->fetchAll());
}

function handleCreateCategory($userId, $input) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, user_id) VALUES (?, ?)");
        $stmt->execute([$input['name'], $userId]);
        
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendError(400, "Category name already exists");
        }
        sendError(500, "Failed to create category");
    }
}

function handleUpdateCategory($userId, $categoryId, $input) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$input['name'], $categoryId, $userId]);
    
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    sendSuccess($stmt->fetch());
}

function handleDeleteCategory($userId, $categoryId) {
    $pdo = getDBConnection();
    
    // Check if any products use this category
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM products WHERE category_id = ? AND user_id = ?");
    $stmt->execute([$categoryId, $userId]);
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
        sendError(400, "Cannot delete category - it is assigned to {$result['count']} product(s)");
    }
    
    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ? AND user_id = ?");
    $stmt->execute([$categoryId, $userId]);
    sendSuccess(['message' => 'Category deleted']);
}

// ==================== SALES (CRITICAL TRANSACTIONAL LOGIC) ====================

function handleCreateSale($userId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        $invoiceId = generateUUID();
        $invoiceNumber = 'INV-' . time() . '-' . substr($invoiceId, 0, 8);
        
        // Validate and deduct stock for all items
        // CRITICAL: Stock deduction = paid_qty + bonus_qty (total units)
        // But revenue calculation uses ONLY paid_qty (done in frontend)
        foreach ($input['items'] as $item) {
            $productId = $item['product_id'];
            $quantity = $item['quantity']; // Paid quantity
            $bonusQty = $item['bonus_quantity'] ?? 0; // Free bonus units
            $totalUnits = $quantity + $bonusQty; // Total units leaving inventory
            
            // Check stock
            $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            
            if (!$product || $product['stock'] < $totalUnits) {
                throw new Exception("Insufficient stock for product $productId");
            }
            
            // Deduct stock (paid + bonus units)
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$totalUnits, $productId]);
        }
        
        // Insert invoice
        $stmt = $pdo->prepare("
            INSERT INTO invoices (id, invoice_number, user_id, customer_name, customer_phone, customer_address, 
                deliveryman_name, subtotal, total, discount_percentage, final_discount_amount, final_total_amount, sale_timestamp, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        ");
        
        $stmt->execute([
            $invoiceId,
            $invoiceNumber,
            $userId,
            $input['customer_name'] ?? null,
            $input['customer_phone'] ?? null,
            $input['customer_address'] ?? null,
            $input['deliveryman_name'] ?? null,
            $input['subtotal'],
            $input['total'],
            $input['discount_percentage'] ?? 0,
            $input['final_discount_amount'] ?? 0,
            $input['final_total_amount']
        ]);
        
        // Insert invoice items
        // NOTE: item['total'] is already calculated in frontend using ONLY paid quantity
        // Bonus quantity is stored but does NOT contribute to revenue
        foreach ($input['items'] as $item) {
            $stmt = $pdo->prepare("
                INSERT INTO invoice_items (invoice_id, product_id, product_name, sku, quantity, 
                    price_per_unit, unit_price, discount, total_line_price, total, bonus_quantity, returned_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $invoiceId,
                $item['product_id'],
                $item['product_name'],
                $item['sku'],
                $item['quantity'],
                $item['unit_price'],
                $item['unit_price'],
                $item['discount'] ?? 0,
                $item['total'],
                $item['total'],
                $item['bonus_quantity'] ?? 0,
                $item['returned_quantity'] ?? 0
            ]);
        }
        
        $pdo->commit();
        
        // Return created invoice
        $stmt = $pdo->prepare("SELECT * FROM invoices WHERE id = ?");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch();
        
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoiceId]);
        $invoice['items'] = $stmt->fetchAll();
        
        sendSuccess($invoice, 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleUpdateSale($userId, $invoiceId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Get original invoice items
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoiceId]);
        $originalItems = $stmt->fetchAll();
        
        // Reverse original stock deductions (paid + bonus)
        foreach ($originalItems as $item) {
            $originalTotal = $item['quantity'] + ($item['bonus_quantity'] ?? 0);
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            $stmt->execute([$originalTotal, $item['product_id']]);
        }
        
        // Deduct new stock (paid + bonus)
        // Revenue uses ONLY paid quantity (calculated in frontend)
        foreach ($input['items'] as $item) {
            $totalUnits = $item['quantity'] + ($item['bonus_quantity'] ?? 0);
            
            $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$item['product_id'], $userId]);
            $product = $stmt->fetch();
            
            if (!$product || $product['stock'] < $totalUnits) {
                throw new Exception("Insufficient stock for product {$item['product_id']}");
            }
            
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$totalUnits, $item['product_id']]);
        }
        
        // Update invoice
        $stmt = $pdo->prepare("
            UPDATE invoices SET customer_name = ?, customer_phone = ?, customer_address = ?,
                deliveryman_name = ?, subtotal = ?, total = ?, discount_percentage = ?,
                final_discount_amount = ?, final_total_amount = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $input['customer_name'] ?? null,
            $input['customer_phone'] ?? null,
            $input['customer_address'] ?? null,
            $input['deliveryman_name'] ?? null,
            $input['subtotal'],
            $input['total'],
            $input['discount_percentage'] ?? 0,
            $input['final_discount_amount'] ?? 0,
            $input['final_total_amount'],
            $invoiceId,
            $userId
        ]);
        
        // Delete old items
        $stmt = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoiceId]);
        
        // Insert new items
        // NOTE: item['total'] already calculated in frontend using ONLY paid quantity
        foreach ($input['items'] as $item) {
            $stmt = $pdo->prepare("
                INSERT INTO invoice_items (invoice_id, product_id, product_name, sku, quantity,
                    price_per_unit, unit_price, discount, total_line_price, total, bonus_quantity, returned_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $invoiceId,
                $item['product_id'],
                $item['product_name'],
                $item['sku'],
                $item['quantity'],
                $item['unit_price'],
                $item['unit_price'],
                $item['discount'] ?? 0,
                $item['total'],
                $item['total'],
                $item['bonus_quantity'] ?? 0,
                $item['returned_quantity'] ?? 0
            ]);
        }
        
        $pdo->commit();
        sendSuccess(['message' => 'Sale updated']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteSale($userId, $invoiceId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Get invoice items
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoiceId]);
        $items = $stmt->fetchAll();
        
        // Restore stock
        foreach ($items as $item) {
            $totalUnits = $item['quantity'] + ($item['bonus_quantity'] ?? 0);
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            $stmt->execute([$totalUnits, $item['product_id']]);
        }
        
        // Soft delete invoice
        $stmt = $pdo->prepare("UPDATE invoices SET is_deleted = 1 WHERE id = ? AND user_id = ?");
        $stmt->execute([$invoiceId, $userId]);
        
        $pdo->commit();
        sendSuccess(['message' => 'Sale deleted']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

// ==================== REPORTS ====================

function handleSalesHistory($userId, $params) {
    $pdo = getDBConnection();
    
    $query = "SELECT * FROM invoices WHERE user_id = ? AND is_deleted = 0";
    $queryParams = [$userId];
    
    if (!empty($params['from_date'])) {
        $query .= " AND sale_timestamp >= ?";
        $queryParams[] = $params['from_date'];
    }
    
    if (!empty($params['to_date'])) {
        $query .= " AND sale_timestamp <= ?";
        $queryParams[] = $params['to_date'];
    }
    
    $query .= " ORDER BY sale_timestamp DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $invoices = $stmt->fetchAll();
    
    // Attach items to each invoice
    foreach ($invoices as &$invoice) {
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoice['id']]);
        $invoice['items'] = $stmt->fetchAll();
    }
    
    sendSuccess($invoices);
}

function handleDashboardStats($userId) {
    $pdo = getDBConnection();
    
    // Get product stats
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM products WHERE user_id = ?");
    $stmt->execute([$userId]);
    $totalProducts = $stmt->fetch()['total'];
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as low_stock FROM products WHERE user_id = ? AND stock <= min_stock");
    $stmt->execute([$userId]);
    $lowStock = $stmt->fetch()['low_stock'];
    
    // Get sales stats
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM invoices WHERE user_id = ? AND is_deleted = 0");
    $stmt->execute([$userId]);
    $totalSales = $stmt->fetch()['total'];
    
    $stmt = $pdo->prepare("SELECT SUM(final_total_amount) as revenue FROM invoices WHERE user_id = ? AND is_deleted = 0");
    $stmt->execute([$userId]);
    $revenue = $stmt->fetch()['revenue'] ?? 0;
    
    $stmt = $pdo->prepare("SELECT SUM(final_discount_amount) as discount FROM invoices WHERE user_id = ? AND is_deleted = 0");
    $stmt->execute([$userId]);
    $totalDiscount = $stmt->fetch()['discount'] ?? 0;
    
    // Calculate Net Profit (Revenue - COGS)
    // COGS = SUM(quantity * cost_price) for all sold items
    $stmt = $pdo->prepare("
        SELECT SUM(ii.quantity * p.cost_price) as cogs
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN products p ON ii.product_id = p.id
        WHERE i.user_id = ? AND i.is_deleted = 0
    ");
    $stmt->execute([$userId]);
    $cogs = $stmt->fetch()['cogs'] ?? 0;
    
    $netProfit = $revenue - $cogs;
    
    sendSuccess([
        'total_products' => (int)$totalProducts,
        'low_stock_count' => (int)$lowStock,
        'total_sales' => (int)$totalSales,
        'total_revenue' => (float)$revenue,
        'total_discount' => (float)$totalDiscount,
        'total_cogs' => (float)$cogs,
        'net_profit' => (float)$netProfit
    ]);
}

function handleItemizedSales($userId, $params) {
    $pdo = getDBConnection();
    $range = $params['range'] ?? 'today';
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = null;
    $endDate = date('Y-m-d H:i:s');
    
    switch ($range) {
        case 'today':
            // Start of today in PKT (00:00:00)
            $startDate = date('Y-m-d 00:00:00');
            break;
        case 'yesterday':
            $startDate = date('Y-m-d 00:00:00', strtotime('-1 day'));
            $endDate = date('Y-m-d 23:59:59', strtotime('-1 day'));
            break;
        case 'last_7_days':
        case 'week':
            $startDate = date('Y-m-d 00:00:00', strtotime('-7 days'));
            break;
        case 'month':
            $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
            break;
        case 'year':
            $startDate = date('Y-m-d 00:00:00', strtotime('-365 days'));
            break;
    }
    
    $query = "  
        SELECT 
            p.id as product_id,
            p.name as product_name,
            SUM(ii.quantity + COALESCE(ii.bonus_quantity, 0)) as total_quantity_sold,
            ii.unit_price,
            SUM(ii.quantity * ii.unit_price) as total_line_revenue
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN products p ON ii.product_id = p.id
        WHERE i.user_id = ? AND i.is_deleted = 0
    ";
    
    $queryParams = [$userId];
    
    if ($startDate) {
        $query .= " AND i.sale_timestamp >= ?";
        $queryParams[] = $startDate;
    }
    
    $query .= " AND i.sale_timestamp <= ?";
    $queryParams[] = $endDate;
    
    $query .= " GROUP BY p.id, p.name, ii.unit_price ORDER BY total_quantity_sold DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $items = $stmt->fetchAll();
    
    // Calculate totals
    $totalQuantity = 0;
    $totalRevenue = 0;
    foreach ($items as $item) {
        $totalQuantity += $item['total_quantity_sold'];
        $totalRevenue += $item['total_line_revenue'];
    }
    
    sendSuccess([
        'range' => $range,
        'items' => $items,
        'total_items' => count($items),
        'total_quantity' => (int)$totalQuantity,
        'total_revenue' => (float)$totalRevenue
    ]);
}

// ==================== INVOICES ====================

function handleGetInvoices($userId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT * FROM invoices 
        WHERE user_id = ? AND is_deleted = 0 
        ORDER BY sale_timestamp DESC
    ");
    $stmt->execute([$userId]);
    $invoices = $stmt->fetchAll();
    
    // Attach items to each invoice
    foreach ($invoices as &$invoice) {
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoice['id']]);
        $invoice['items'] = $stmt->fetchAll();
    }
    
    sendSuccess($invoices);
}

function handleGetInvoice($userId, $invoiceId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT * FROM invoices 
        WHERE id = ? AND user_id = ? AND is_deleted = 0
    ");
    $stmt->execute([$invoiceId, $userId]);
    $invoice = $stmt->fetch();
    
    if (!$invoice) {
        sendError(404, "Invoice not found");
    }
    
    $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $stmt->execute([$invoiceId]);
    $invoice['items'] = $stmt->fetchAll();
    
    sendSuccess($invoice);
}

// ==================== RESTOCK ====================

function handleCreateRestock($userId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        $restockId = generateUUID();
        $restockNumber = 'RESTOCK-' . time() . '-' . substr($restockId, 0, 8);
        
        $bookerName = $input['booker_name'] ?? null;
        $deliverymanName = $input['deliveryman_name'] ?? null;
        $items = $input['items'] ?? [];
        
        if (empty($items)) {
            throw new Exception("No items provided for restock");
        }
        
        $totalRestockValue = 0;
        $totalItemsRestocked = 0;
        
        // Process each item in the restock
        foreach ($items as $item) {
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            $costPerUnit = $item['cost_per_unit'] ?? 0;
            
            if ($quantity <= 0) {
                throw new Exception("Quantity must be greater than 0");
            }
            
            // Get current product info
            $stmt = $pdo->prepare("SELECT name, packing_unit FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            
            if (!$product) {
                throw new Exception("Product not found: $productId");
            }
            
            // Calculate item value
            $itemValue = $costPerUnit * $quantity;
            $totalRestockValue += $itemValue;
            $totalItemsRestocked += $quantity;
            
            // Store product details for the restock item
            $itemName = $product['name'];
            $packingUnit = $product['packing_unit'] ?? null;
        }
        
        // Insert restock transaction header
        $stmt = $pdo->prepare("
            INSERT INTO restock_transactions 
            (id, user_id, restock_number, restock_timestamp, total_restock_value, total_items_restocked, booker_name, deliveryman_name)
            VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $restockId,
            $userId,
            $restockNumber,
            $totalRestockValue,
            $totalItemsRestocked,
            $bookerName,
            $deliverymanName
        ]);
        
        // Insert restock items (detail records)
        foreach ($items as $item) {
            $itemId = generateUUID();
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            $costPerUnit = $item['cost_per_unit'] ?? 0;
            $totalCost = $costPerUnit * $quantity;
            
            // Get product details again for this item
            $stmt = $pdo->prepare("SELECT name, packing_unit FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            
            $itemName = $product['name'];
            $packingUnit = $product['packing_unit'] ?? null;
            
            // Insert restock item detail
            $stmt = $pdo->prepare("
                INSERT INTO restock_items 
                (id, restock_id, product_id, product_name, packing_unit, quantity, cost_per_unit, total_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $itemId,
                $restockId,
                $productId,
                $itemName,
                $packingUnit,
                $quantity,
                $costPerUnit,
                $totalCost
            ]);
        }
        
        // Update product stock for all items
        foreach ($items as $item) {
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$quantity, $productId, $userId]);
        }
        
        $pdo->commit();
        
        // Return created restock transaction with items
        $stmt = $pdo->prepare("
            SELECT rt.*, 
                   JSON_ARRAYAGG(
                     JSON_OBJECT(
                       'id', ri.id,
                       'product_id', ri.product_id,
                       'product_name', ri.product_name,
                       'packing_unit', ri.packing_unit,
                       'quantity', ri.quantity,
                       'cost_per_unit', ri.cost_per_unit,
                       'total_cost', ri.total_cost
                     )
                   ) as items
            FROM restock_transactions rt
            LEFT JOIN restock_items ri ON rt.id = ri.restock_id
            WHERE rt.id = ?
            GROUP BY rt.id
        ");
        $stmt->execute([$restockId]);
        $restock = $stmt->fetch();
        
        // Parse the items JSON
        $restock['items'] = json_decode($restock['items'], true);
        
        sendSuccess($restock, 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleGetRestockTransactions($userId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT rt.*, 
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', ri.id,
                   'product_id', ri.product_id,
                   'product_name', ri.product_name,
                   'packing_unit', ri.packing_unit,
                   'quantity', ri.quantity,
                   'cost_per_unit', ri.cost_per_unit,
                   'total_cost', ri.total_cost
                 )
               ) as items
        FROM restock_transactions rt
        LEFT JOIN restock_items ri ON rt.id = ri.restock_id
        WHERE rt.user_id = ?
        GROUP BY rt.id
        ORDER BY rt.restock_timestamp DESC
    ");
    $stmt->execute([$userId]);
    $restocks = $stmt->fetchAll();
    
    // Parse items JSON for each restock
    foreach ($restocks as &$restock) {
        $restock['items'] = json_decode($restock['items'], true);
    }
    
    sendSuccess($restocks);
}

function handleGetRestockTransaction($userId, $restockId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT rt.*, 
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', ri.id,
                   'product_id', ri.product_id,
                   'product_name', ri.product_name,
                   'packing_unit', ri.packing_unit,
                   'quantity', ri.quantity,
                   'cost_per_unit', ri.cost_per_unit,
                   'total_cost', ri.total_cost
                 )
               ) as items
        FROM restock_transactions rt
        LEFT JOIN restock_items ri ON rt.id = ri.restock_id
        WHERE rt.id = ? AND rt.user_id = ?
        GROUP BY rt.id
    ");
    $stmt->execute([$restockId, $userId]);
    $restock = $stmt->fetch();
    
    if (!$restock) {
        sendError(404, "Restock transaction not found");
    }
    
    // Parse items JSON
    $restock['items'] = json_decode($restock['items'], true);
    
    sendSuccess($restock);
}

// New function for combined restock reporting
function handleGetCombinedRestockReport($userId, $params) {
    $pdo = getDBConnection();
    
    $range = $params['range'] ?? 'today';
    $startDate = $params['start_date'] ?? null;
    $endDate = $params['end_date'] ?? null;
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    if (!$startDate && !$endDate) {
        // Get current date components for month calculations
        $now = new DateTime();
        $firstDayOfMonth = new DateTime($now->format('Y-m-01'));
        $lastDayOfMonth = clone $firstDayOfMonth;
        $lastDayOfMonth->modify('last day of this month');
        
        $firstDayOfLastMonth = clone $firstDayOfMonth;
        $firstDayOfLastMonth->modify('first day of last month');
        $lastDayOfLastMonth = clone $firstDayOfMonth;
        $lastDayOfLastMonth->modify('last day of last month');
        
        switch ($range) {
            case 'today':
                $startDate = date('Y-m-d 00:00:00');
                $endDate = date('Y-m-d 23:59:59');
                break;
            case 'yesterday':
                $startDate = date('Y-m-d 00:00:00', strtotime('-1 day'));
                $endDate = date('Y-m-d 23:59:59', strtotime('-1 day'));
                break;
            case 'last_7_days':
                $startDate = date('Y-m-d 00:00:00', strtotime('-7 days'));
                $endDate = date('Y-m-d 23:59:59');
                break;
            case 'last_30_days':
                $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
                $endDate = date('Y-m-d 23:59:59');
                break;
            case 'this_month':
                $startDate = $firstDayOfMonth->format('Y-m-d 00:00:00');
                $endDate = $lastDayOfMonth->format('Y-m-d 23:59:59');
                break;
            case 'last_month':
                $startDate = $firstDayOfLastMonth->format('Y-m-d 00:00:00');
                $endDate = $lastDayOfLastMonth->format('Y-m-d 23:59:59');
                break;
            default:
                $startDate = date('Y-m-d 00:00:00');
                $endDate = date('Y-m-d 23:59:59');
        }
    }
    
    // Query to get combined restock report
    $query = "
        SELECT 
            ri.product_name,
            ri.packing_unit,
            SUM(ri.quantity) as total_quantity,
            AVG(ri.cost_per_unit) as avg_cost_per_unit,
            SUM(ri.total_cost) as total_cost,
            COUNT(DISTINCT rt.id) as transaction_count,
            MAX(rt.booker_name) as booker_name,
            MAX(rt.deliveryman_name) as deliveryman_name
        FROM restock_items ri
        JOIN restock_transactions rt ON ri.restock_id = rt.id
        WHERE rt.user_id = ? 
        AND rt.restock_timestamp >= ? 
        AND rt.restock_timestamp <= ?
        GROUP BY ri.product_name, ri.packing_unit
        ORDER BY total_quantity DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$userId, $startDate, $endDate]);
    $items = $stmt->fetchAll();
    
    // Calculate totals
    $totalRestockAmount = 0;
    $totalQuantity = 0;
    $totalProducts = count($items);
    
    foreach ($items as $item) {
        $totalRestockAmount += $item['total_cost'];
        $totalQuantity += $item['total_quantity'];
    }
    
    sendSuccess([
        'range' => $range,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'items' => $items,
        'total_restock_amount' => $totalRestockAmount,
        'total_quantity' => $totalQuantity,
        'total_products' => $totalProducts
    ]);
}

// ==================== NET PROFIT CALCULATION ====================

?>
