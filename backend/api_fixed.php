<?php
// HANDLING CORS AT THE VERY TOP
// This ensures headers are sent even if the script crashes later
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_domains = ['http://localhost:3000', 'http://localhost:3001', 'https://realgiveaways.com', 'http://realgiveaways.com'];

if (in_array($origin, $allowed_domains)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    // Default to allowing all for development convenience, but be careful in production
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

// ==================== INCLUDE PHASE 1 HANDLERS ====================
if (file_exists(__DIR__ . '/phase1_handlers.php')) {
    require_once __DIR__ . '/phase1_handlers.php';
}

if (file_exists(__DIR__ . '/phase1_handlers_part2.php')) {
    require_once __DIR__ . '/phase1_handlers_part2.php';
}

if (file_exists(__DIR__ . '/phase1_handlers_part3.php')) {
    require_once __DIR__ . '/phase1_handlers_part3.php';
}

// Database Connection
function getDBConnection($allowFail = false) {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        if ($allowFail) {
            return null;
        } else {
            if (!headers_sent()) {
                header('Content-Type: application/json');
            }
            
            http_response_code(500);
            echo json_encode([
                'error' => 'Database connection failed',
                'message' => $e->getMessage()
            ]);
            exit();
        }
    }
}

// Helper: check if soft-delete column exists on restock_transactions
function hasSoftDelete($pdo) {
    static $checked = false;
    static $exists = false;
    if ($checked) return $exists;
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM restock_transactions LIKE 'deleted_at'");
        $stmt->execute();
        $exists = $stmt->fetch() ? true : false;
    } catch (Exception $e) {
        $exists = false;
    }
    $checked = true;
    return $exists;
}

// Authentication Helper
function authenticateRequest() {
    $headers = getAllHeaders();
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

// Polyfill for getallheaders() function on Windows/IIS (guard against redeclaration)
if (!function_exists('getAllHeaders')) {
    function getAllHeaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
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
function safeJsonOutput($data) {
    if (function_exists('json_encode')) {
        return json_encode($data);
    }
    // Minimal manual JSON for simple responses when json extension is missing
    if (is_array($data)) {
        $pairs = [];
        foreach ($data as $k => $v) {
            $key = addslashes((string)$k);
            if (is_array($v)) {
                $val = '""'; // Simplify nested structures
            } else if (is_string($v)) {
                $val = '"' . addslashes($v) . '"';
            } else if (is_bool($v)) {
                $val = $v ? 'true' : 'false';
            } else if (is_null($v)) {
                $val = 'null';
            } else {
                $val = (string)$v;
            }
            $pairs[] = '"' . $key . '":' . $val;
        }
        return '{' . implode(',', $pairs) . '}';
    }
    return '"' . addslashes((string)$data) . '"';
}

// Safe JSON decode that works without the json extension for simple objects
function safeJsonDecode($raw) {
    if (function_exists('json_decode')) {
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
    $result = [];
    if (!is_string($raw) || $raw === '') return $result;
    // Very simple parser for flat JSON objects: {"key":"value", "n":123, "b":true}
    if (preg_match_all('/"([^"\\]+)"\s*:\s*("((?:\\.|[^"\\])*)"|true|false|null|-?\d+(?:\.\d+)?)/i', $raw, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $m) {
            $key = $m[1];
            $val = $m[2];
            if ($val[0] === '"') {
                // Unescape common sequences
                $str = stripcslashes($m[3]);
                $result[$key] = $str;
            } else {
                $lv = strtolower($val);
                if ($lv === 'true' || $lv === 'false') {
                    $result[$key] = ($lv === 'true');
                } else if ($lv === 'null') {
                    $result[$key] = null;
                } else {
                    $result[$key] = (strpos($val, '.') !== false) ? floatval($val) : intval($val);
                }
            }
        }
    }
    return $result;
}

function sendSuccess($data = null, $code = 200) {
    http_response_code($code);
    if (!headers_sent()) header('Content-Type: application/json');
    echo safeJsonOutput($data);
    exit();
}

function sendError($code, $message) {
    http_response_code($code);
    if (!headers_sent()) header('Content-Type: application/json');
    echo safeJsonOutput(['detail' => $message]);
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

// Parse input safely without requiring json extension
$rawInput = file_get_contents('php://input');
$input = safeJsonDecode($rawInput);

// Route handling
$loginPatternMatch = preg_match('#/api/login$#', $path) || 
                     strpos($path, '/auth/login') !== false || 
                     preg_match('#^/login$#', $path) || 
                     preg_match('#/api\.php/login$#', $path) || 
                     preg_match('#/api\.php/api/login$#', $path);

// Add specific check for the exact path in your curl request
$exactPathMatch = $path === '/api.php/api/login';

// Defer extension checks: require pdo_mysql for non-login routes only
$isLoginRoute = ($requestMethod === 'POST' && ($loginPatternMatch || $exactPathMatch));
if (!$isLoginRoute && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    if (!extension_loaded('pdo_mysql')) {
        sendError(500, 'Server configuration error: pdo_mysql extension not loaded.');
    }
    // Do not hard-require json; safeJsonOutput covers missing extension
}

if ($requestMethod === 'POST' && ($loginPatternMatch || $exactPathMatch)) {
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
        if ($requestMethod === 'PUT') handleUpdateRestock($userId, $restockId, $input);
        if ($requestMethod === 'DELETE') handleDeleteRestock($userId, $restockId);
    } elseif (preg_match('#/api\.php/api/reports/combined_restock$#', $path) || preg_match('#/api/reports/combined_restock$#', $path)) {
        if ($requestMethod === 'GET') handleGetCombinedRestockReport($userId, $_GET);
    }
    // Market Supply
    elseif (preg_match('#/api\.php/api/supply$#', $path) || preg_match('#/api/supply$#', $path)) {
        if ($requestMethod === 'POST') handleCreateSupply($userId, $input);
    } elseif (preg_match('#/api\.php/api/supply/history$#', $path) || preg_match('#/api/supply/history$#', $path)) {
        if ($requestMethod === 'GET') handleGetSupplyHistory($userId, $_GET);
    }
    // ==================== PHASE 1 NEW ENDPOINTS ====================
    // Warehouses
    elseif (preg_match('#/api\.php/api/warehouses$#', $path) || preg_match('#/api/warehouses$#', $path)) {
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetWarehouses')) {
                handleGetWarehouses($userId);
            } else {
                sendError(500, "Warehouse function not found");
            }
        }
        if ($requestMethod === 'POST') {
            if (function_exists('handleCreateWarehouse')) {
                handleCreateWarehouse($userId, $input);
            } else {
                sendError(500, "Create warehouse function not found");
            }
        }
    } elseif (preg_match('#/api\.php/api/warehouses/(\d+)$#', $path, $matches) || preg_match('#/api/warehouses/(\d+)$#', $path, $matches)) {
        $warehouseId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetWarehouse')) {
                handleGetWarehouse($userId, $warehouseId);
            } else {
                sendError(500, "Get warehouse function not found");
            }
        }
        if ($requestMethod === 'PUT') {
            if (function_exists('handleUpdateWarehouse')) {
                handleUpdateWarehouse($userId, $warehouseId, $input);
            } else {
                sendError(500, "Update warehouse function not found");
            }
        }
        if ($requestMethod === 'DELETE') {
            if (function_exists('handleDeleteWarehouse')) {
                handleDeleteWarehouse($userId, $warehouseId);
            } else {
                sendError(500, "Delete warehouse function not found");
            }
        }
    }
    // Suppliers
    elseif (preg_match('#/api\.php/api/suppliers$#', $path) || preg_match('#/api/suppliers$#', $path)) {
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetSuppliers')) {
                handleGetSuppliers($userId);
            } else {
                sendError(500, "Suppliers function not found");
            }
        }
        if ($requestMethod === 'POST') {
            if (function_exists('handleCreateSupplier')) {
                handleCreateSupplier($userId, $input);
            } else {
                sendError(500, "Create supplier function not found");
            }
        }
    } elseif (preg_match('#/api\.php/api/suppliers/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/suppliers/([a-f0-9\-]+)$#', $path, $matches)) {
        $supplierId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetSupplier')) {
                handleGetSupplier($userId, $supplierId);
            } else {
                sendError(500, "Get supplier function not found");
            }
        }
        if ($requestMethod === 'PUT') {
            if (function_exists('handleUpdateSupplier')) {
                handleUpdateSupplier($userId, $supplierId, $input);
            } else {
                sendError(500, "Update supplier function not found");
            }
        }
        if ($requestMethod === 'DELETE') {
            if (function_exists('handleDeleteSupplier')) {
                handleDeleteSupplier($userId, $supplierId);
            } else {
                sendError(500, "Delete supplier function not found");
            }
        }
    }
    // Customers
    elseif (preg_match('#/api\.php/api/customers$#', $path) || preg_match('#/api/customers$#', $path)) {
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetCustomers')) {
                handleGetCustomers($userId);
            } else {
                sendError(500, "Customers function not found");
            }
        }
        if ($requestMethod === 'POST') {
            if (function_exists('handleCreateCustomer')) {
                handleCreateCustomer($userId, $input);
            } else {
                sendError(500, "Create customer function not found");
            }
        }
    } elseif (preg_match('#/api\.php/api/customers/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/customers/([a-f0-9\-]+)$#', $path, $matches)) {
        $customerId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetCustomer')) {
                handleGetCustomer($userId, $customerId);
            } else {
                sendError(500, "Get customer function not found");
            }
        }
        if ($requestMethod === 'PUT') {
            if (function_exists('handleUpdateCustomer')) {
                handleUpdateCustomer($userId, $customerId, $input);
            } else {
                sendError(500, "Update customer function not found");
            }
        }
        if ($requestMethod === 'DELETE') {
            if (function_exists('handleDeleteCustomer')) {
                handleDeleteCustomer($userId, $customerId);
            } else {
                sendError(500, "Delete customer function not found");
            }
        }
    }
    // Brokers
    elseif (preg_match('#/api\.php/api/brokers$#', $path) || preg_match('#/api/brokers$#', $path)) {
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetBrokers')) {
                handleGetBrokers($userId);
            } else {
                sendError(500, "Brokers function not found");
            }
        }
        if ($requestMethod === 'POST') {
            if (function_exists('handleCreateBroker')) {
                handleCreateBroker($userId, $input);
            } else {
                sendError(500, "Create broker function not found");
            }
        }
    } elseif (preg_match('#/api\.php/api/brokers/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/brokers/([a-f0-9\-]+)$#', $path, $matches)) {
        $brokerId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetBroker')) {
                handleGetBroker($userId, $brokerId);
            } else {
                sendError(500, "Get broker function not found");
            }
        }
        if ($requestMethod === 'PUT') {
            if (function_exists('handleUpdateBroker')) {
                handleUpdateBroker($userId, $brokerId, $input);
            } else {
                sendError(500, "Update broker function not found");
            }
        }
        if ($requestMethod === 'DELETE') {
            if (function_exists('handleDeleteBroker')) {
                handleDeleteBroker($userId, $brokerId);
            } else {
                sendError(500, "Delete broker function not found");
            }
        }
    }
    // Drivers
    elseif (preg_match('#/api\.php/api/drivers$#', $path) || preg_match('#/api/drivers$#', $path)) {
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetDrivers')) {
                handleGetDrivers($userId);
            } else {
                sendError(500, "Drivers function not found");
            }
        }
        if ($requestMethod === 'POST') {
            if (function_exists('handleCreateDriver')) {
                handleCreateDriver($userId, $input);
            } else {
                sendError(500, "Create driver function not found");
            }
        }
    } elseif (preg_match('#/api\.php/api/drivers/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/drivers/([a-f0-9\-]+)$#', $path, $matches)) {
        $driverId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetDriver')) {
                handleGetDriver($userId, $driverId);
            } else {
                sendError(500, "Get driver function not found");
            }
        }
        if ($requestMethod === 'PUT') {
            if (function_exists('handleUpdateDriver')) {
                handleUpdateDriver($userId, $driverId, $input);
            } else {
                sendError(500, "Update driver function not found");
            }
        }
        if ($requestMethod === 'DELETE') {
            if (function_exists('handleDeleteDriver')) {
                handleDeleteDriver($userId, $driverId);
            } else {
                sendError(500, "Delete driver function not found");
            }
        }
    }
    // Sales Orders
    elseif (preg_match('#/api\.php/api/orders$#', $path) || preg_match('#/api/orders$#', $path)) {
        if ($requestMethod === 'GET') handleGetOrders($userId);
        if ($requestMethod === 'POST') handleCreateOrder($userId, $input);
    } elseif (preg_match('#/api\.php/api/orders/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/orders/([a-f0-9\-]+)$#', $path, $matches)) {
        $orderId = $matches[1];
        if ($requestMethod === 'GET') handleGetOrder($userId, $orderId);
        if ($requestMethod === 'PUT') handleUpdateOrder($userId, $orderId, $input);
        if ($requestMethod === 'DELETE') handleDeleteOrder($userId, $orderId);
    } elseif (preg_match('#/api\.php/api/orders/([a-f0-9\-]+)/confirm$#', $path, $matches) || preg_match('#/api/orders/([a-f0-9\-]+)/confirm$#', $path, $matches)) {
        $orderId = $matches[1];
        if ($requestMethod === 'POST') handleConfirmOrder($userId, $orderId);
    } elseif (preg_match('#/api\.php/api/orders/([a-f0-9\-]+)/convert_to_invoice$#', $path, $matches) || preg_match('#/api/orders/([a-f0-9\-]+)/convert_to_invoice$#', $path, $matches)) {
        $orderId = $matches[1];
        if ($requestMethod === 'POST') handleConvertOrderToInvoice($userId, $orderId);
    }
    // Challans
    elseif (preg_match('#/api\.php/api/challans$#', $path) || preg_match('#/api/challans$#', $path)) {
        if ($requestMethod === 'GET') handleGetChallans($userId);
        if ($requestMethod === 'POST') handleCreateChallan($userId, $input);
    } elseif (preg_match('#/api\.php/api/challans/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/challans/([a-f0-9\-]+)$#', $path, $matches)) {
        $challanId = $matches[1];
        if ($requestMethod === 'GET') handleGetChallan($userId, $challanId);
        if ($requestMethod === 'PUT') handleUpdateChallan($userId, $challanId, $input);
        if ($requestMethod === 'DELETE') handleDeleteChallan($userId, $challanId);
    } elseif (preg_match('#/api\.php/api/challans/([a-f0-9\-]+)/status$#', $path, $matches) || preg_match('#/api/challans/([a-f0-9\-]+)/status$#', $path, $matches)) {
        $challanId = $matches[1];
        if ($requestMethod === 'POST') handleUpdateChallanStatus($userId, $challanId, $input);
    }
    // Returns
    elseif (preg_match('#/api\.php/api/returns$#', $path) || preg_match('#/api/returns$#', $path)) {
        if ($requestMethod === 'GET') handleGetReturns($userId);
        if ($requestMethod === 'POST') handleCreateReturn($userId, $input);
    } elseif (preg_match('#/api\.php/api/returns/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/returns/([a-f0-9\-]+)$#', $path, $matches)) {
        $returnId = $matches[1];
        if ($requestMethod === 'GET') handleGetReturn($userId, $returnId);
    }
    // Stock Adjustments
    elseif (preg_match('#/api\.php/api/stock/adjust$#', $path) || preg_match('#/api/stock/adjust$#', $path)) {
        if ($requestMethod === 'POST') handleStockAdjustment($userId, $input);
    } elseif (preg_match('#/api\.php/api/stock/adjustments$#', $path) || preg_match('#/api/stock/adjustments$#', $path)) {
        if ($requestMethod === 'GET') handleGetStockAdjustments($userId, $_GET);
    }
    // Expenses
    elseif (preg_match('#/api\.php/api/expenses$#', $path) || preg_match('#/api/expenses$#', $path)) {
        if ($requestMethod === 'GET') handleGetExpenses($userId, $_GET);
        if ($requestMethod === 'POST') handleCreateExpense($userId, $input);
    } elseif (preg_match('#/api\.php/api/expenses/([a-f0-9\-]+)$#', $path, $matches) || preg_match('#/api/expenses/([a-f0-9\-]+)$#', $path, $matches)) {
        $expenseId = $matches[1];
        if ($requestMethod === 'DELETE') handleDeleteExpense($userId, $expenseId);
    }
    // Price History
    elseif (preg_match('#/api\.php/api/products/([a-f0-9\-]+)/price_history$#', $path, $matches) || preg_match('#/api/products/([a-f0-9\-]+)/price_history$#', $path, $matches)) {
        $productId = $matches[1];
        if ($requestMethod === 'GET') handleGetPriceHistory($userId, $productId);
    }
    // New Reports
    elseif (preg_match('#/api\.php/api/reports/stock_movement#', $path) || preg_match('#/api/reports/stock_movement#', $path)) {
        handleStockMovementReport($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/reports/warehouse_stock#', $path) || preg_match('#/api/reports/warehouse_stock#', $path)) {
        handleWarehouseStockReport($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/reports/expenses#', $path) || preg_match('#/api/reports/expenses#', $path)) {
        handleExpenseReport($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/reports/commissions#', $path) || preg_match('#/api/reports/commissions#', $path)) {
        handleCommissionReport($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/reports/challans#', $path) || preg_match('#/api/reports/challans#', $path)) {
        handleChallanReport($userId, $_GET);
    } elseif (preg_match('#/api\.php/api/reports/pnl#', $path) || preg_match('#/api/reports/pnl#', $path)) {
        handlePnLReport($userId, $_GET);
    } else {
        sendError(404, "Endpoint not found");
    }
}

// ==================== MARKET SUPPLY ====================

function parsePackingUnitPieces($packingUnit) {
    if (!$packingUnit) return null;
    if (preg_match('/\((\d+)\s*pcs?\)/i', $packingUnit, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/\((\d+)\)/', $packingUnit, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/(\d+)/', $packingUnit, $m)) {
        return (int)$m[1];
    }
    return null;
}

function handleCreateSupply($userId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        $supplyId = generateUUID();
        $supplyNumber = 'SUPPLY-' . time() . '-' . substr($supplyId, 0, 8);
        
        $items = $input['items'] ?? [];
        
        if (empty($items)) {
            throw new Exception("No items provided for supply");
        }
        
        $totalAmount = 0;
        $totalQuantityPieces = 0;
        $totalCartons = 0;
        
        // Process each item in the supply
        foreach ($items as $item) {
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            
            if ($quantity <= 0) {
                throw new Exception("Quantity must be greater than 0");
            }
            
            // Check stock and get packing unit
            $stmt = $pdo->prepare("SELECT stock, default_selling_price, packing_unit FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            
            if (!$product || $product['stock'] < $quantity) {
                throw new Exception("Insufficient stock for product $productId");
            }
            
            // Deduct stock
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$quantity, $productId]);

            $itemValue = $product['default_selling_price'] * $quantity;
            $totalAmount += $itemValue;
            $totalQuantityPieces += $quantity;

            // Calculate cartons (CTNS) based on packing unit pieces
            $piecesPerCarton = parsePackingUnitPieces($product['packing_unit'] ?? '');
            if ($piecesPerCarton && $piecesPerCarton > 0) {
                $totalCartons += ($quantity / $piecesPerCarton);
            }
        }
        
        // Insert supply transaction header
        $stmt = $pdo->prepare("
            INSERT INTO market_supply 
            (id, supply_number, customer_id, warehouse_id, driver_id, broker_id, total_ctns, total_quantity, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $supplyId,
            $supplyNumber,
            null, // customer_id
            1, // warehouse_id (default)
            null, // driver_id
            null, // broker_id
            $totalCartons,
            $totalQuantityPieces,
            $userId
        ]);
        
        // Insert supply items (detail records)
        foreach ($items as $item) {
            $itemId = generateUUID();
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            $return_quantity = $item['return_quantity'] ?? 0;
            // Compute cartons per item based on product packing unit
            $stmt = $pdo->prepare("SELECT packing_unit FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $prod = $stmt->fetch();
            $ppu = parsePackingUnitPieces($prod['packing_unit'] ?? '');
            $total_cartons = ($ppu && $ppu > 0) ? ($quantity / $ppu) : 0.0;
            
            // Insert supply item detail
            $stmt = $pdo->prepare("
                INSERT INTO market_supply_items 
                (id, market_supply_id, product_id, quantity, return_quantity, ctns)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $itemId,
                $supplyId,
                $productId,
                $quantity,
                $return_quantity,
                $total_cartons
            ]);
        }
        
        $pdo->commit();
        
        // Return created supply transaction with items
        $stmt = $pdo->prepare("SELECT * FROM market_supply WHERE id = ?");
        $stmt->execute([$supplyId]);
        $supply = $stmt->fetch();
        
        $stmt = $pdo->prepare("SELECT * FROM market_supply_items WHERE market_supply_id = ?");
        $stmt->execute([$supplyId]);
        $supply['items'] = $stmt->fetchAll();
        
        sendSuccess($supply, 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleGetSupplyHistory($userId, $params) {
    $pdo = getDBConnection();
    
    $query = "SELECT * FROM market_supply WHERE created_by = ?";
    $queryParams = [$userId];
    
    // Handle date filtering with timezone conversion
    if (!empty($params['from_date'])) {
        try {
            // Convert ISO string to DateTime and set to Asia/Karachi timezone
            $fromDate = new DateTime($params['from_date']);
            $fromDate->setTimezone(new DateTimeZone('Asia/Karachi'));
            // Set to start of day in PKT
            $fromDate->setTime(0, 0, 0);
            // Convert back to UTC for database query
            $fromDate->setTimezone(new DateTimeZone('UTC'));
            $fromDateString = $fromDate->format('Y-m-d H:i:s');
            
            $query .= " AND created_at >= ?";
            $queryParams[] = $fromDateString;
        } catch (Exception $e) {
            // If date parsing fails, log the error but continue without date filter
            error_log("Date parsing error for from_date: " . $e->getMessage());
        }
    }
    
    if (!empty($params['to_date'])) {
        try {
            // Convert ISO string to DateTime and set to Asia/Karachi timezone
            $toDate = new DateTime($params['to_date']);
            $toDate->setTimezone(new DateTimeZone('Asia/Karachi'));
            // Set to end of day in PKT
            $toDate->setTime(23, 59, 59);
            // Convert back to UTC for database query
            $toDate->setTimezone(new DateTimeZone('UTC'));
            $toDateString = $toDate->format('Y-m-d H:i:s');
            
            $query .= " AND created_at <= ?";
            $queryParams[] = $toDateString;
        } catch (Exception $e) {
            // If date parsing fails, log the error but continue without date filter
            error_log("Date parsing error for to_date: " . $e->getMessage());
        }
    }
    
    $query .= " ORDER BY created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $supplies = $stmt->fetchAll();
    
    // Attach items to each supply
    foreach ($supplies as &$supply) {
        $stmt = $pdo->prepare("SELECT * FROM market_supply_items WHERE market_supply_id = ?");
        $stmt->execute([$supply['id']]);
        $supply['items'] = $stmt->fetchAll();
    }
    
    sendSuccess($supplies);
}

// ==================== AUTHENTICATION ====================

function handleLogin($input) {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if ($username === '' || $password === '') {
        sendError(400, "Username and password required");
    }

    // DB-backed authentication (aligns with server.py)
    $pdo = getDBConnection(true); // Allow fail for login
    if (!$pdo) {
        // Fallback to file-based auth if DB connection fails
        $usersFile = __DIR__ . '/users.json';
        if (!file_exists($usersFile)) {
            sendError(500, "No users configured and database unavailable");
        }
        
        $users = json_decode(file_get_contents($usersFile), true);
        if (!isset($users[$username])) {
            sendError(401, "Invalid credentials");
        }
        
        $storedPassword = $users[$username]['password'];
        if (!verifyUserPassword($password, $storedPassword)) {
            sendError(401, "Invalid credentials");
        }
        
        $token = generateToken($username);
        sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $username,
                'username' => $username,
                'email' => $users[$username]['email'] ?? '',
                'first_name' => $users[$username]['first_name'] ?? '',
                'last_name' => $users[$username]['last_name'] ?? ''
            ]
        ]);
        return;
    }

    // DB-based authentication
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            sendError(401, "Invalid credentials");
        }

        if (!verifyUserPassword($password, $user['password'])) {
            sendError(401, "Invalid credentials");
        }

        $token = generateToken($username);
        sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name']
            ]
        ]);
    } catch (Exception $e) {
        sendError(500, "Login failed: " . $e->getMessage());
    }
}

function handleRegister($input) {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $email = trim($input['email'] ?? '');

    if ($username === '' || $password === '' || $email === '') {
        sendError(400, "Username, password, and email are required");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError(400, "Invalid email format");
    }

    $pdo = getDBConnection();
    
    try {
        // Check if user already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            sendError(409, "User already exists with this username or email");
        }

        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Create user
        $userId = generateUUID();
        $stmt = $pdo->prepare("
            INSERT INTO users (id, username, password, email, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $username, $hashedPassword, $email]);

        sendSuccess(['message' => 'User registered successfully'], 201);
    } catch (Exception $e) {
        sendError(500, "Registration failed: " . $e->getMessage());
    }
}

// ==================== PRODUCTS ====================

function handleGetProducts($userId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.user_id = ? AND p.deleted_at IS NULL
        ORDER BY p.name ASC
    ");
    $stmt->execute([$userId]);
    $products = $stmt->fetchAll();
    
    sendSuccess($products);
}

function handleCreateProduct($userId, $input) {
    $pdo = getDBConnection();
    
    $name = $input['name'] ?? '';
    $categoryId = $input['category_id'] ?? null;
    $sku = $input['sku'] ?? null;
    $barcode = $input['barcode'] ?? null;
    $description = $input['description'] ?? '';
    $costPrice = $input['cost_price'] ?? 0;
    $sellingPrice = $input['selling_price'] ?? 0;
    $stock = $input['stock'] ?? 0;
    $minStock = $input['min_stock'] ?? 0;
    $unitId = $input['unit_id'] ?? null;
    $brand = $input['brand'] ?? '';
    $packingUnit = $input['packing_unit'] ?? '';
    
    if (empty($name)) {
        sendError(400, "Product name is required");
    }
    
    try {
        $productId = generateUUID();
        
        $stmt = $pdo->prepare("
            INSERT INTO products 
            (id, user_id, name, category_id, sku, barcode, description, cost_price, default_selling_price, stock, min_stock, unit_id, brand, packing_unit, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $productId,
            $userId,
            $name,
            $categoryId,
            $sku,
            $barcode,
            $description,
            $costPrice,
            $sellingPrice,
            $stock,
            $minStock,
            $unitId,
            $brand,
            $packingUnit
        ]);
        
        // Return the created product
        $stmt = $pdo->prepare("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ?
        ");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        sendSuccess($product, 201);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleUpdateProduct($userId, $productId, $input) {
    $pdo = getDBConnection();
    
    // Check if product exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$productId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Product not found");
    }
    
    $name = $input['name'] ?? '';
    $categoryId = $input['category_id'] ?? null;
    $sku = $input['sku'] ?? null;
    $barcode = $input['barcode'] ?? null;
    $description = $input['description'] ?? '';
    $costPrice = $input['cost_price'] ?? 0;
    $sellingPrice = $input['selling_price'] ?? 0;
    $stock = $input['stock'] ?? 0;
    $minStock = $input['min_stock'] ?? 0;
    $unitId = $input['unit_id'] ?? null;
    $brand = $input['brand'] ?? '';
    $packingUnit = $input['packing_unit'] ?? '';
    
    if (empty($name)) {
        sendError(400, "Product name is required");
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE products SET 
            name = ?, category_id = ?, sku = ?, barcode = ?, description = ?, 
            cost_price = ?, default_selling_price = ?, stock = ?, min_stock = ?, 
            unit_id = ?, brand = ?, packing_unit = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $name,
            $categoryId,
            $sku,
            $barcode,
            $description,
            $costPrice,
            $sellingPrice,
            $stock,
            $minStock,
            $unitId,
            $brand,
            $packingUnit,
            $productId,
            $userId
        ]);
        
        // Return the updated product
        $stmt = $pdo->prepare("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ?
        ");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        sendSuccess($product);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleDeleteProduct($userId, $productId) {
    $pdo = getDBConnection();
    
    // Check if product exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$productId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Product not found");
    }
    
    try {
        // Soft delete
        $stmt = $pdo->prepare("UPDATE products SET deleted_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$productId, $userId]);
        
        sendSuccess(['message' => 'Product deleted successfully']);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleRestock($userId, $input) {
    $pdo = getDBConnection();
    
    $productId = $input['product_id'] ?? '';
    $quantity = $input['quantity'] ?? 0;
    $costPerUnit = $input['cost_per_unit'] ?? 0;
    
    if (empty($productId) || $quantity <= 0) {
        sendError(400, "Product ID and quantity (greater than 0) are required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Update product stock and cost price
        $stmt = $pdo->prepare("
            UPDATE products 
            SET stock = stock + ?, cost_price = ? 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$quantity, $costPerUnit, $productId, $userId]);
        
        // Insert restock transaction
        $transactionId = generateUUID();
        $stmt = $pdo->prepare("
            INSERT INTO restock_transactions 
            (id, user_id, product_id, quantity, cost_per_unit, transaction_date) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$transactionId, $userId, $productId, $quantity, $costPerUnit]);
        
        $pdo->commit();
        
        sendSuccess(['message' => 'Product restocked successfully'], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

// ==================== CATEGORIES ====================

function handleGetCategories($userId) {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC");
    $stmt->execute([$userId]);
    $categories = $stmt->fetchAll();
    
    sendSuccess($categories);
}

function handleCreateCategory($userId, $input) {
    $pdo = getDBConnection();
    
    $name = $input['name'] ?? '';
    
    if (empty($name)) {
        sendError(400, "Category name is required");
    }
    
    try {
        $categoryId = generateUUID();
        
        $stmt = $pdo->prepare("INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$categoryId, $userId, $name]);
        
        // Return the created category
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        $category = $stmt->fetch();
        
        sendSuccess($category, 201);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleUpdateCategory($userId, $categoryId, $input) {
    $pdo = getDBConnection();
    
    // Check if category exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?");
    $stmt->execute([$categoryId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Category not found");
    }
    
    $name = $input['name'] ?? '';
    
    if (empty($name)) {
        sendError(400, "Category name is required");
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$name, $categoryId, $userId]);
        
        // Return the updated category
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        $category = $stmt->fetch();
        
        sendSuccess($category);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleDeleteCategory($userId, $categoryId) {
    $pdo = getDBConnection();
    
    // Check if category exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?");
    $stmt->execute([$categoryId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Category not found");
    }
    
    try {
        // Soft delete
        $stmt = $pdo->prepare("UPDATE categories SET deleted_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$categoryId, $userId]);
        
        sendSuccess(['message' => 'Category deleted successfully']);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

// ==================== SALES ====================

function handleCreateSale($userId, $input) {
    $pdo = getDBConnection();
    
    $customerName = $input['customer_name'] ?? '';
    $items = $input['items'] ?? [];
    $discount = $input['discount'] ?? 0;
    $tax = $input['tax'] ?? 0;
    $paymentMethod = $input['payment_method'] ?? 'cash';
    $bookerName = $input['booker_name'] ?? null;
    $deliverymanName = $input['deliveryman_name'] ?? null;
    
    if (empty($items)) {
        sendError(400, "At least one item is required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Generate a unique invoice number
        do {
            $invoiceId = generateUUID();
            $invoiceNumber = 'INV-' . time() . '-' . substr($invoiceId, 0, 8);
            $stmt = $pdo->prepare("SELECT id FROM invoices WHERE invoice_number = ?");
            $stmt->execute([$invoiceNumber]);
            $exists = $stmt->fetch();
        } while ($exists);
        
        // Calculate totals
        $subtotal = 0;
        $totalQuantity = 0;
        foreach ($items as $item) {
            $subtotal += $item['quantity'] * $item['selling_price'];
            $totalQuantity += $item['quantity'];
        }
        
        $totalDiscount = $discount;
        $totalTax = $tax;
        $finalTotal = $subtotal - $totalDiscount + $totalTax;
        
        // Insert invoice
        $stmt = $pdo->prepare("
            INSERT INTO invoices 
            (id, user_id, invoice_number, customer_name, subtotal, discount, tax, final_total_amount, total_quantity, payment_method, booker_name, deliveryman_name, sale_timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $invoiceId,
            $userId,
            $invoiceNumber,
            $customerName,
            $subtotal,
            $totalDiscount,
            $totalTax,
            $finalTotal,
            $totalQuantity,
            $paymentMethod,
            $bookerName,
            $deliverymanName
        ]);
        
        // Insert invoice items and update product stock
        foreach ($items as $item) {
            $itemId = generateUUID();
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            $sellingPrice = $item['selling_price'];
            $total = $quantity * $sellingPrice;
            
            // Get product cost price for COGS calculation
            $stmt = $pdo->prepare("SELECT cost_price FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            $costPrice = $product['cost_price'] ?? 0;
            
            // Insert invoice item
            $stmt = $pdo->prepare("
                INSERT INTO invoice_items 
                (id, invoice_id, product_id, quantity, selling_price, total, cost_price_snapshot) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $itemId,
                $invoiceId,
                $productId,
                $quantity,
                $sellingPrice,
                $total,
                $costPrice
            ]);
            
            // Update product stock
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$quantity, $productId, $userId]);
        }
        
        $pdo->commit();
        
        // Return the created invoice with items
        $stmt = $pdo->prepare("
            SELECT i.*, 
                   JSON_ARRAYAGG(
                     JSON_OBJECT(
                       'id', ii.id,
                       'product_id', ii.product_id,
                       'quantity', ii.quantity,
                       'selling_price', ii.selling_price,
                       'total', ii.total
                     )
                   ) as items
            FROM invoices i
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
            WHERE i.id = ?
            GROUP BY i.id
        ");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch();
        
        // Parse the items JSON
        $invoice['items'] = json_decode($invoice['items'], true);
        
        sendSuccess($invoice, 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleUpdateSale($userId, $invoiceId, $input) {
    $pdo = getDBConnection();
    
    // Check if invoice exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?");
    $stmt->execute([$invoiceId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Invoice not found");
    }
    
    $customerName = $input['customer_name'] ?? '';
    $items = $input['items'] ?? [];
    $discount = $input['discount'] ?? 0;
    $tax = $input['tax'] ?? 0;
    $paymentMethod = $input['payment_method'] ?? 'cash';
    $bookerName = $input['booker_name'] ?? null;
    $deliverymanName = $input['deliveryman_name'] ?? null;
    
    if (empty($items)) {
        sendError(400, "At least one item is required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Delete existing invoice items
        $stmt = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$invoiceId]);
        
        // Calculate totals
        $subtotal = 0;
        $totalQuantity = 0;
        foreach ($items as $item) {
            $subtotal += $item['quantity'] * $item['selling_price'];
            $totalQuantity += $item['quantity'];
        }
        
        $totalDiscount = $discount;
        $totalTax = $tax;
        $finalTotal = $subtotal - $totalDiscount + $totalTax;
        
        // Update invoice
        $stmt = $pdo->prepare("
            UPDATE invoices SET 
            customer_name = ?, subtotal = ?, discount = ?, tax = ?, final_total_amount = ?, 
            total_quantity = ?, payment_method = ?, booker_name = ?, deliveryman_name = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $customerName,
            $subtotal,
            $totalDiscount,
            $totalTax,
            $finalTotal,
            $totalQuantity,
            $paymentMethod,
            $bookerName,
            $deliverymanName,
            $invoiceId,
            $userId
        ]);
        
        // Insert new invoice items and update product stock
        foreach ($items as $item) {
            $itemId = generateUUID();
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            $sellingPrice = $item['selling_price'];
            $total = $quantity * $sellingPrice;
            
            // Get product cost price for COGS calculation
            $stmt = $pdo->prepare("SELECT cost_price FROM products WHERE id = ? AND user_id = ?");
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            $costPrice = $product['cost_price'] ?? 0;
            
            // Insert invoice item
            $stmt = $pdo->prepare("
                INSERT INTO invoice_items 
                (id, invoice_id, product_id, quantity, selling_price, total, cost_price_snapshot) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $itemId,
                $invoiceId,
                $productId,
                $quantity,
                $sellingPrice,
                $total,
                $costPrice
            ]);
            
            // Update product stock
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$quantity, $productId, $userId]);
        }
        
        $pdo->commit();
        
        // Return the updated invoice with items
        $stmt = $pdo->prepare("
            SELECT i.*, 
                   JSON_ARRAYAGG(
                     JSON_OBJECT(
                       'id', ii.id,
                       'product_id', ii.product_id,
                       'quantity', ii.quantity,
                       'selling_price', ii.selling_price,
                       'total', ii.total
                     )
                   ) as items
            FROM invoices i
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
            WHERE i.id = ?
            GROUP BY i.id
        ");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch();
        
        // Parse the items JSON
        $invoice['items'] = json_decode($invoice['items'], true);
        
        sendSuccess($invoice);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteSale($userId, $invoiceId) {
    $pdo = getDBConnection();
    
    // Check if invoice exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?");
    $stmt->execute([$invoiceId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Invoice not found");
    }
    
    try {
        // Soft delete
        $stmt = $pdo->prepare("UPDATE invoices SET is_deleted = 1, updated_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$invoiceId, $userId]);
        
        sendSuccess(['message' => 'Invoice deleted successfully']);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

// ==================== REPORTS ====================

function handleSalesHistory($userId, $params) {
    $pdo = getDBConnection();
    
    $query = "SELECT * FROM invoices WHERE user_id = ? AND is_deleted = 0";
    $queryParams = [$userId];
    
    // Handle date filtering with timezone conversion
    if (!empty($params['from_date'])) {
        try {
            // Convert ISO string to DateTime and set to Asia/Karachi timezone
            $fromDate = new DateTime($params['from_date']);
            $fromDate->setTimezone(new DateTimeZone('Asia/Karachi'));
            // Set to start of day in PKT
            $fromDate->setTime(0, 0, 0);
            // Convert back to UTC for database query
            $fromDate->setTimezone(new DateTimeZone('UTC'));
            $fromDateString = $fromDate->format('Y-m-d H:i:s');
            
            $query .= " AND sale_timestamp >= ?";
            $queryParams[] = $fromDateString;
        } catch (Exception $e) {
            // If date parsing fails, log the error but continue without date filter
            error_log("Date parsing error for from_date: " . $e->getMessage());
        }
    }
    
    if (!empty($params['to_date'])) {
        try {
            // Convert ISO string to DateTime and set to Asia/Karachi timezone
            $toDate = new DateTime($params['to_date']);
            $toDate->setTimezone(new DateTimeZone('Asia/Karachi'));
            // Set to end of day in PKT
            $toDate->setTime(23, 59, 59);
            // Convert back to UTC for database query
            $toDate->setTimezone(new DateTimeZone('UTC'));
            $toDateString = $toDate->format('Y-m-d H:i:s');
            
            $query .= " AND sale_timestamp <= ?";
            $queryParams[] = $toDateString;
        } catch (Exception $e) {
            // If date parsing fails, log the error but continue without date filter
            error_log("Date parsing error for to_date: " . $e->getMessage());
        }
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
    try {
        $pdo = getDBConnection();
        
        // Get product stats
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM products WHERE user_id = ?");
            $stmt->execute([$userId]);
            $totalProducts = $stmt->fetch()['total'];
        } catch (Exception $e) { $totalProducts = 0; }
        
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as low_stock FROM products WHERE user_id = ? AND stock <= min_stock");
            $stmt->execute([$userId]);
            $lowStock = $stmt->fetch()['low_stock'];
        } catch (Exception $e) { $lowStock = 0; }
        
        // Get sales stats
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM invoices WHERE user_id = ? AND is_deleted = 0");
            $stmt->execute([$userId]);
            $totalSales = $stmt->fetch()['total'];
        } catch (Exception $e) { $totalSales = 0; }
        
        try {
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(final_total_amount), 0) as revenue FROM invoices WHERE user_id = ? AND is_deleted = 0");
            $stmt->execute([$userId]);
            $revenue = $stmt->fetch()['revenue'] ?? 0;
        } catch (Exception $e) { $revenue = 0; }
        
        try {
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(final_discount_amount), 0) as discount FROM invoices WHERE user_id = ? AND is_deleted = 0");
            $stmt->execute([$userId]);
            $totalDiscount = $stmt->fetch()['discount'] ?? 0;
        } catch (Exception $e) { $totalDiscount = 0; }

        // Get restock stats
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM restock_transactions WHERE user_id = ? AND (deleted_at IS NULL)");
            $stmt->execute([$userId]);
            $totalRestocks = $stmt->fetch()['total'];
        } catch (Exception $e) { $totalRestocks = 0; }
        
        // Calculate Net Profit (Revenue - COGS - Expenses)
        // COGS = SUM(quantity * cost_price_snapshot) for all sold items
        try {
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(ii.quantity * ii.cost_price_snapshot), 0) as cogs
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE i.user_id = ? AND i.is_deleted = 0
            ");
            $stmt->execute([$userId]);
            $cogsResult = $stmt->fetch();
            $cogs = $cogsResult['cogs'] ?? 0;
        } catch (Exception $e) { $cogs = 0; }
        
        // Get expenses
        try {
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(amount), 0) as expenses
                FROM expenses
                WHERE created_by = ?
            ");
            $stmt->execute([$userId]);
            $expensesResult = $stmt->fetch();
            $expenses = $expensesResult['expenses'] ?? 0;
        } catch (Exception $e) { $expenses = 0; }
        
        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $expenses;
        
        sendSuccess([
            'total_products' => (int)$totalProducts,
            'low_stock_count' => (int)$lowStock,
            'total_sales' => (int)$totalSales,
            'total_restocks' => (int)$totalRestocks,
            'total_revenue' => (float)$revenue,
            'total_discount' => (float)$totalDiscount,
            'total_cogs' => (float)$cogs,
            'total_expenses' => (float)$expenses,
            'gross_profit' => (float)$grossProfit,
            'net_profit' => (float)$netProfit
        ]);
    } catch (Exception $e) {
        // Fallback if DB connection fails completely
        sendSuccess([
            'total_products' => 0,
            'low_stock_count' => 0,
            'total_sales' => 0,
            'total_restocks' => 0,
            'total_revenue' => 0,
            'total_discount' => 0,
            'total_cogs' => 0,
            'total_expenses' => 0,
            'gross_profit' => 0,
            'net_profit' => 0,
            'error' => 'Failed to load stats: ' . $e->getMessage()
        ]);
    }
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
            // Start of yesterday in PKT (00:00:00) to end of yesterday in PKT (23:59:59)
            $startDate = date('Y-m-d 00:00:00', strtotime('-1 day'));
            $endDate = date('Y-m-d 23:59:59', strtotime('-1 day'));
            break;
        case 'this_week':
            // Start of this week in PKT (Monday 00:00:00) to end of this week in PKT (Sunday 23:59:59)
            $startDate = date('Y-m-d 00:00:00', strtotime('this week'));
            $endDate = date('Y-m-d 23:59:59', strtotime('this week'));
            break;
        case 'last_week':
            // Start of last week in PKT (Monday 00:00:00) to end of last week in PKT (Sunday 23:59:59)
            $startDate = date('Y-m-d 00:00:00', strtotime('last week'));
            $endDate = date('Y-m-d 23:59:59', strtotime('last week'));
            break;
        case 'this_month':
            // Start of this month in PKT (1st day 00:00:00) to end of this month in PKT (last day 23:59:59)
            $startDate = date('Y-m-01 00:00:00');
            $endDate = date('Y-m-t 23:59:59');
            break;
        case 'last_month':
            // Start of last month in PKT (1st day 00:00:00) to end of last month in PKT (last day 23:59:59)
            $startDate = date('Y-m-01 00:00:00', strtotime('last month'));
            $endDate = date('Y-m-t 23:59:59', strtotime('last month'));
            break;
        case 'this_year':
            // Start of this year in PKT (1st day 00:00:00) to end of this year in PKT (last day 23:59:59)
            $startDate = date('Y-01-01 00:00:00');
            $endDate = date('Y-12-31 23:59:59');
            break;
        case 'last_year':
            // Start of last year in PKT (1st day 00:00:00) to end of last year in PKT (last day 23:59:59)
            $startDate = date('Y-01-01 00:00:00', strtotime('last year'));
            $endDate = date('Y-12-31 23:59:59', strtotime('last year'));
            break;
        default:
            // Default to today
            $startDate = date('Y-m-d 00:00:00');
            break;
    }
    
    try {
        // Get total revenue
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(total), 0) as revenue
            FROM invoices
            WHERE user_id = ? AND is_deleted = 0 AND created_at BETWEEN ? AND ?
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $revenueResult = $stmt->fetch();
        $revenue = $revenueResult['revenue'] ?? 0;
        
        // Get total discount
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(discount), 0) as discount
            FROM invoices
            WHERE user_id = ? AND is_deleted = 0 AND created_at BETWEEN ? AND ?
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $discountResult = $stmt->fetch();
        $totalDiscount = $discountResult['discount'] ?? 0;
        
        // Get total sales
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total_sales
            FROM invoices
            WHERE user_id = ? AND is_deleted = 0 AND created_at BETWEEN ? AND ?
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $salesResult = $stmt->fetch();
        $totalSales = $salesResult['total_sales'] ?? 0;
        
        // Get total restocks
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total_restocks
            FROM restock_transactions
            WHERE user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $restocksResult = $stmt->fetch();
        $totalRestocks = $restocksResult['total_restocks'] ?? 0;

        // Get total sales amount
        $stmt = $pdo->prepare("
            SELECT SUM(total) as total_sales_amount
            FROM invoices
            WHERE user_id = ? AND is_deleted = 0 AND created_at BETWEEN ? AND ?
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $salesAmountResult = $stmt->fetch();
        $totalSalesAmount = $salesAmountResult['total_sales_amount'] ?? 0;

        // Get total restock amount
        $stmt = $pdo->prepare("
            SELECT SUM(amount) as total_restock_amount
            FROM restock_transactions
            WHERE user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $restockAmountResult = $stmt->fetch();
        $totalRestockAmount = $restockAmountResult['total_restock_amount'] ?? 0;

        // Get total profit
        $totalProfit = $totalSalesAmount - $totalRestockAmount;

        sendSuccess([
            'range' => $range,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'revenue' => (float)$revenue,
            'discount' => (float)$totalDiscount,
            'total_sales' => (int)$totalSales,
            'total_restocks' => (int)$totalRestocks,
            'sales_amount' => (float)$totalSalesAmount,
            'restock_amount' => (float)$totalRestockAmount,
            'profit' => (float)$totalProfit
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch itemized sales: ' . $e->getMessage());
    }
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
        
        // Generate a unique restock number
        do {
            $restockId = generateUUID();
            $restockNumber = 'RESTOCK-' . time() . '-' . substr($restockId, 0, 8);
            $stmt = $pdo->prepare("SELECT id FROM restock_transactions WHERE restock_number = ?");
            $stmt->execute([$restockNumber]);
            $exists = $stmt->fetch();
        } while ($exists);
        
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
        WHERE rt.user_id = ? AND (rt.deleted_at IS NULL)
        GROUP BY rt.id
        ORDER BY rt.restock_timestamp DESC
    ");
    $stmt->execute([$userId]);
    $transactions = $stmt->fetchAll();
    
    // Parse the items JSON for each transaction
    foreach ($transactions as &$transaction) {
        $transaction['items'] = json_decode($transaction['items'], true);
    }
    
    sendSuccess($transactions);
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
        WHERE rt.id = ? AND rt.user_id = ? AND (rt.deleted_at IS NULL)
        GROUP BY rt.id
    ");
    $stmt->execute([$restockId, $userId]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        sendError(404, "Restock transaction not found");
    }
    
    // Parse the items JSON
    $transaction['items'] = json_decode($transaction['items'], true);
    
    sendSuccess($transaction);
}

function handleUpdateRestock($userId, $restockId, $input) {
    $pdo = getDBConnection();
    
    // Check if restock transaction exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM restock_transactions WHERE id = ? AND user_id = ?");
    $stmt->execute([$restockId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Restock transaction not found");
    }
    
    $bookerName = $input['booker_name'] ?? null;
    $deliverymanName = $input['deliveryman_name'] ?? null;
    $items = $input['items'] ?? [];
    
    if (empty($items)) {
        sendError(400, "No items provided for restock");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Delete existing restock items
        $stmt = $pdo->prepare("DELETE FROM restock_items WHERE restock_id = ?");
        $stmt->execute([$restockId]);
        
        // Calculate totals
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
            
            // Insert restock item detail
            $itemId = generateUUID();
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
                $itemValue
            ]);
        }
        
        // Update restock transaction header
        $stmt = $pdo->prepare("
            UPDATE restock_transactions SET 
            total_restock_value = ?, total_items_restocked = ?, booker_name = ?, deliveryman_name = ?, restock_timestamp = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $totalRestockValue,
            $totalItemsRestocked,
            $bookerName,
            $deliverymanName,
            $restockId,
            $userId
        ]);
        
        // Update product stock for all items
        foreach ($items as $item) {
            $productId = $item['product_id'];
            $quantity = $item['quantity'];
            
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$quantity, $productId, $userId]);
        }
        
        $pdo->commit();
        
        // Return updated restock transaction with items
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
        
        sendSuccess($restock);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteRestock($userId, $restockId) {
    $pdo = getDBConnection();
    
    // Check if restock transaction exists and belongs to user
    $stmt = $pdo->prepare("SELECT id FROM restock_transactions WHERE id = ? AND user_id = ?");
    $stmt->execute([$restockId, $userId]);
    if (!$stmt->fetch()) {
        sendError(404, "Restock transaction not found");
    }
    
    try {
        // Soft delete
        $stmt = $pdo->prepare("UPDATE restock_transactions SET deleted_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$restockId, $userId]);
        
        sendSuccess(['message' => 'Restock transaction deleted successfully']);
    } catch (Exception $e) {
        sendError(400, $e->getMessage());
    }
}

function handleGetCombinedRestockReport($userId, $params) {
    $pdo = getDBConnection();
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = $params['start_date'] ?? date('Y-m-d 00:00:00', strtotime('-30 days'));
    $endDate = $params['end_date'] ?? date('Y-m-d 23:59:59');
    
    try {
        // Get all restock transactions in the date range
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
            WHERE rt.user_id = ? AND rt.restock_timestamp BETWEEN ? AND ? AND (rt.deleted_at IS NULL)
            GROUP BY rt.id
            ORDER BY rt.restock_timestamp DESC
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $transactions = $stmt->fetchAll();
        
        // Parse the items JSON for each transaction and calculate totals
        $totalRestockAmount = 0;
        $totalQuantity = 0;
        $totalProducts = 0;
        $uniqueProducts = [];
        
        foreach ($transactions as &$transaction) {
            $transaction['items'] = json_decode($transaction['items'], true);
            $totalRestockAmount += $transaction['total_restock_value'];
            
            if (is_array($transaction['items'])) {
                foreach ($transaction['items'] as $item) {
                    $totalQuantity += $item['quantity'];
                    if (!in_array($item['product_id'], $uniqueProducts)) {
                        $uniqueProducts[] = $item['product_id'];
                    }
                }
            }
        }
        
        $totalProducts = count($uniqueProducts);
        
        sendSuccess([
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'items' => $transactions,
            'total_restock_amount' => $totalRestockAmount,
            'total_quantity' => $totalQuantity,
            'total_products' => $totalProducts
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch combined restock report: ' . $e->getMessage());
    }
}

// ==================== STOCK MOVEMENT REPORT ====================

function handleStockMovementReport($userId, $params) {
    $pdo = getDBConnection();
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = $params['start_date'] ?? date('Y-m-d 00:00:00', strtotime('-30 days'));
    $endDate = $params['end_date'] ?? date('Y-m-d 23:59:59');
    
    try {
        // Get all stock movements (restocks and sales) in the date range
        $stmt = $pdo->prepare("
            SELECT 
                'restock' as type,
                rt.restock_timestamp as date,
                rt.booker_name,
                rt.deliveryman_name,
                ri.product_name,
                ri.quantity,
                ri.cost_per_unit,
                ri.total_cost
            FROM restock_transactions rt
            JOIN restock_items ri ON rt.id = ri.restock_id
            WHERE rt.user_id = ? AND rt.restock_timestamp BETWEEN ? AND ? AND (rt.deleted_at IS NULL)
            
            UNION ALL
            
            SELECT 
                'sale' as type,
                i.sale_timestamp as date,
                i.booker_name,
                i.deliveryman_name,
                p.name as product_name,
                ii.quantity,
                ii.selling_price as cost_per_unit,
                ii.total
            FROM invoices i
            JOIN invoice_items ii ON i.id = ii.invoice_id
            JOIN products p ON ii.product_id = p.id
            WHERE i.user_id = ? AND i.sale_timestamp BETWEEN ? AND ? AND i.is_deleted = 0
            
            ORDER BY date DESC
        ");
        $stmt->execute([$userId, $startDate, $endDate, $userId, $startDate, $endDate]);
        $movements = $stmt->fetchAll();
        
        sendSuccess([
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'items' => $movements
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch stock movement report: ' . $e->getMessage());
    }
}

// ==================== WAREHOUSE STOCK REPORT ====================

function handleWarehouseStockReport($userId, $params) {
    $pdo = getDBConnection();
    
    $warehouseId = $params['warehouse_id'] ?? null;
    
    try {
        if ($warehouseId) {
            // Get stock for specific warehouse
            $stmt = $pdo->prepare("
                SELECT p.name, p.sku, p.stock, p.min_stock, p.cost_price, p.default_selling_price, w.name as warehouse_name
                FROM products p
                JOIN warehouse_products wp ON p.id = wp.product_id
                JOIN warehouses w ON wp.warehouse_id = w.id
                WHERE p.user_id = ? AND wp.warehouse_id = ? AND p.deleted_at IS NULL
                ORDER BY p.name ASC
            ");
            $stmt->execute([$userId, $warehouseId]);
        } else {
            // Get stock for all warehouses
            $stmt = $pdo->prepare("
                SELECT p.name, p.sku, p.stock, p.min_stock, p.cost_price, p.default_selling_price, w.name as warehouse_name
                FROM products p
                JOIN warehouse_products wp ON p.id = wp.product_id
                JOIN warehouses w ON wp.warehouse_id = w.id
                WHERE p.user_id = ? AND p.deleted_at IS NULL
                ORDER BY w.name ASC, p.name ASC
            ");
            $stmt->execute([$userId]);
        }
        
        $stockItems = $stmt->fetchAll();
        
        sendSuccess($stockItems);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch warehouse stock report: ' . $e->getMessage());
    }
}

// ==================== EXPENSE REPORT ====================

function handleExpenseReport($userId, $params) {
    $pdo = getDBConnection();
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = $params['start_date'] ?? date('Y-m-d 00:00:00', strtotime('-30 days'));
    $endDate = $params['end_date'] ?? date('Y-m-d 23:59:59');
    
    try {
        // Get all expenses in the date range
        $stmt = $pdo->prepare("
            SELECT *
            FROM expenses
            WHERE created_by = ? AND created_at BETWEEN ? AND ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $expenses = $stmt->fetchAll();
        
        // Calculate total expenses
        $totalExpenses = 0;
        foreach ($expenses as $expense) {
            $totalExpenses += $expense['amount'];
        }
        
        sendSuccess([
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'items' => $expenses,
            'total_expenses' => $totalExpenses
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch expense report: ' . $e->getMessage());
    }
}

// ==================== COMMISSION REPORT ====================

function handleCommissionReport($userId, $params) {
    $pdo = getDBConnection();
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = $params['start_date'] ?? date('Y-m-d 00:00:00', strtotime('-30 days'));
    $endDate = $params['end_date'] ?? date('Y-m-d 23:59:59');
    
    try {
        // Get all sales with commission information in the date range
        $stmt = $pdo->prepare("
            SELECT i.*, 
                   JSON_ARRAYAGG(
                     JSON_OBJECT(
                       'id', ii.id,
                       'product_id', ii.product_id,
                       'quantity', ii.quantity,
                       'selling_price', ii.selling_price,
                       'total', ii.total
                     )
                   ) as items
            FROM invoices i
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
            WHERE i.user_id = ? AND i.sale_timestamp BETWEEN ? AND ? AND i.is_deleted = 0
            GROUP BY i.id
            ORDER BY i.sale_timestamp DESC
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $invoices = $stmt->fetchAll();
        
        // Parse the items JSON for each invoice and calculate commissions
        $totalSales = 0;
        $totalCommission = 0;
        
        foreach ($invoices as &$invoice) {
            $invoice['items'] = json_decode($invoice['items'], true);
            $totalSales += $invoice['final_total_amount'];
            // Assuming a fixed 5% commission rate for demonstration
            $invoice['commission'] = $invoice['final_total_amount'] * 0.05;
            $totalCommission += $invoice['commission'];
        }
        
        sendSuccess([
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'items' => $invoices,
            'total_sales' => $totalSales,
            'total_commission' => $totalCommission
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch commission report: ' . $e->getMessage());
    }
}

// ==================== CHALLAN REPORT ====================

function handleChallanReport($userId, $params) {
    $pdo = getDBConnection();
    
    // Set timezone to Pakistan Standard Time (GMT+5)
    date_default_timezone_set('Asia/Karachi');
    
    // Calculate date range in PKT timezone
    $startDate = $params['start_date'] ?? date('Y-m-d 00:00:00', strtotime('-30 days'));
    $endDate = $params['end_date'] ?? date('Y-m-d 23:59:59');
    
    try {
        // Get all challans in the date range
        $stmt = $pdo->prepare("
            SELECT *
            FROM challans
            WHERE created_by = ? AND created_at BETWEEN ? AND ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId, $startDate, $endDate]);
        $challans = $stmt->fetchAll();
        
        sendSuccess([
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'items' => $challans
        ]);
    } catch (Exception $e) {
        sendError(500, 'Failed to fetch challan report: ' . $e->getMessage());
    }
}

// ==================== P&L REPORT ====================

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