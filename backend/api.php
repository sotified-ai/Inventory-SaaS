<?php
header('X-Debug-Step: 1-Start'); // Immediately check if the script starts

// Add debugging information
header('X-Debug-Request-Method: ' . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));
header('X-Debug-Request-URI: ' . ($_SERVER['REQUEST_URI'] ?? 'UNKNOWN'));
header('X-Debug-Path: ' . (parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? 'UNKNOWN'));

// Extension checks are deferred until after routing is determined so
// that the login route can function without pdo_mysql/json if needed.

// Environment config (no external config files) using process env with defaults
$env = function($key, $default = null) {
    $val = getenv($key);
    return ($val === false || $val === '') ? $default : $val;
};



// LOCAL DATABASE CONFIGURATION
// define('DB_NAME', $env('DB_NAME', 'inv'));
// define('DB_USER', $env('DB_USER', 'inv'));
// define('DB_PASS', $env('DB_PASSWORD', 'inv07'));
// define('DB_HOST', $env('DB_HOST', 'localhost'));
// define('DB_PORT', (int)$env('DB_PORT', 3306));
// define('DB_ENGINE', $env('DB_ENGINE', 'mysql'));
// define('APP_SECRET', $env('APP_SECRET', 'inventory-saas-secret-key-change-in-production'));
// define('CORS_ORIGINS', $env('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001'));

// PRODUCTION DATABASE CONFIGURATION (COMMENTED OUT)
define('DB_NAME', $env('DB_NAME', 'realgiveaways_inventory'));
define('DB_USER', $env('DB_USER', 'realgiveaways_inventory'));
define('DB_PASS', $env('DB_PASSWORD', '!nv3T0rY'));
define('DB_HOST', $env('DB_HOST', 'localhost'));
define('DB_PORT', (int)$env('DB_PORT', 3306));
define('DB_ENGINE', $env('DB_ENGINE', 'mysql'));
define('APP_SECRET', $env('APP_SECRET', 'inventory-saas-secret-key-change-in-production'));
define('CORS_ORIGINS', $env('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001'));

header('X-Debug-Step: 2-Env-Loaded');

// Set a global exception handler to ensure JSON output for all errors
set_exception_handler(function($exception) {
    // Ensure headers are set to JSON
    if (!headers_sent()) {
        header('Content-Type: application/json');
        header('X-Debug-Exception: Yes');
        header('X-Debug-Exception-Message: ' . $exception->getMessage());
        header('X-Debug-Exception-File: ' . $exception->getFile());
        header('X-Debug-Exception-Line: ' . $exception->getLine());
    }
    http_response_code(500);
    
    $errorDetails = [
        'error' => 'An unexpected server error occurred.',
        'message' => $exception->getMessage(),
    ];

    // Only show detailed error info in local environment
    if (defined('CURRENT_ENVIRONMENT') && CURRENT_ENVIRONMENT === 'local') {
        $errorDetails['file'] = $exception->getFile();
        $errorDetails['line'] = $exception->getLine();
        $errorDetails['trace'] = $exception->getTraceAsString();
    }

    echo safeJsonOutput($errorDetails);
    exit();
});



// PRODUCTION UPDATE: Enhanced CORS with dynamic origin support
// IMPORTANT: CORS headers MUST be set before Content-Type
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
// Use environment variable CORS_ORIGINS if present, otherwise defaults from config.php
$corsEnv = getenv('CORS_ORIGINS') ?: (defined('CORS_ORIGINS') ? CORS_ORIGINS : 'https://realgiveaways.com,http://realgiveaways.com');
$allowedOrigins = array_map('trim', explode(',', $corsEnv));
// Always allow localhost dev origins for testing regardless of environment
$allowedOrigins[] = 'http://localhost:3000';

if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Expose-Headers: Content-Length, Content-Type, X-Debug-Step, X-Debug-Input-Raw'); // Expose debug header
header('Access-Control-Max-Age: 86400');

header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== INCLUDE PHASE 1 HANDLERS ====================
header('X-Debug-Step: 4-Including-Handlers');
if (file_exists(__DIR__ . '/phase1_handlers.php')) {
    require_once __DIR__ . '/phase1_handlers.php';
    header('X-Debug-Phase1-Handlers: Loaded');
    // Add debug to check if function exists after inclusion
    if (function_exists('handleGetWarehouses')) {
        header('X-Debug-Warehouse-Function: Found');
    } else {
        header('X-Debug-Warehouse-Function: Missing');
    }
} else {
    header('X-Debug-Phase1-Handlers: Not-Found');
}

if (file_exists(__DIR__ . '/phase1_handlers_part2.php')) {
    require_once __DIR__ . '/phase1_handlers_part2.php';
    header('X-Debug-Phase1-Handlers-Part2: Loaded');
} else {
    header('X-Debug-Phase1-Handlers-Part2: Not-Found');
}

if (file_exists(__DIR__ . '/phase1_handlers_part3.php')) {
    require_once __DIR__ . '/phase1_handlers_part3.php';
    header('X-Debug-Phase1-Handlers-Part3: Loaded');
} else {
    header('X-Debug-Phase1-Handlers-Part3: Not-Found');
}

if (file_exists(__DIR__ . '/customer_handlers.php')) {
    require_once __DIR__ . '/customer_handlers.php';
    header('X-Debug-Customer-Handlers: Loaded');
} else {
    header('X-Debug-Customer-Handlers: Not-Found');
}
header('X-Debug-Step: 5-Handlers-Included');

// Database Connection
function getDBConnection($allowFail = false) {
    header('X-Debug-Step: 3-Get-DB-Connection'); // Check if DB connection function is called
    header('X-Debug-DB-Host: ' . DB_HOST);
    header('X-Debug-DB-Name: ' . DB_NAME);
    header('X-Debug-DB-User: ' . DB_USER);
    header('X-Debug-DB-Pass: ' . DB_PASS); // This might expose sensitive information in logs
    header('X-Debug-DB-Pass-Length: ' . strlen(DB_PASS));
    
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        header('X-Debug-DSN: ' . $dsn);
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        header('X-Debug-Step: 3.1-PDO-Success'); // Check if PDO object is created
        return $pdo;
    } catch (PDOException $e) {
        if ($allowFail) {
            // For login flow, allow fallback when DB connection fails
            header('X-Debug-Step: 3.2-PDO-Failed-Allowed');
            header('X-Debug-DB-Error: ' . $e->getMessage());
            return null;
        } else {
            // Ensure this error is always JSON
            if (!headers_sent()) {
                header('Content-Type: application/json');
            }
            header('X-Debug-Step: 3.2-PDO-Failed'); // Check if PDO object is created
            header('X-Debug-DB-Error: ' . $e->getMessage());
            
            http_response_code(500);
            echo json_encode([
                'error' => 'Database connection failed',
                'message' => $e->getMessage(),
                'debug_step' => '3.2-PDO-Failed'
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

// Add debugging for route matching
header('X-Debug-Route-Method: ' . $requestMethod);
header('X-Debug-Route-Path: ' . $path);

// Parse input safely without requiring json extension
$rawInput = file_get_contents('php://input');
$input = safeJsonDecode($rawInput);
// Add debugging for input (raw only to avoid json dependency in headers)
header('X-Debug-Input-Raw: ' . substr($rawInput ?: '', 0, 200));

// Route handling
$loginPatternMatch = preg_match('#/api/login$#', $path) || 
                     strpos($path, '/auth/login') !== false || 
                     preg_match('#^/login$#', $path) || 
                     preg_match('#/api\.php/login$#', $path) || 
                     preg_match('#/api\.php/api/login$#', $path);

// Add specific check for the exact path in your curl request
$exactPathMatch = $path === '/api.php/api/login' || $path === '/api/login';
header('X-Debug-Exact-Path-Match: ' . ($exactPathMatch ? 'YES' : 'NO'));

header('X-Debug-Login-Pattern-Match: ' . ($loginPatternMatch ? 'YES' : 'NO'));

// Defer extension checks: require pdo_mysql for non-login routes only
$isLoginRoute = ($requestMethod === 'POST' && ($loginPatternMatch || $exactPathMatch));
if (!$isLoginRoute && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    if (!extension_loaded('pdo_mysql')) {
        sendError(500, 'Server configuration error: pdo_mysql extension not loaded.');
    }
    // Do not hard-require json; safeJsonOutput covers missing extension
}

if ($requestMethod === 'POST' && ($loginPatternMatch || $exactPathMatch)) {
    header('X-Debug-Route-Login: YES');
    handleLogin($input);
} elseif ($requestMethod === 'POST' && strpos($path, '/auth/register') !== false) {
    header('X-Debug-Route-Register: YES');
    handleRegister($input);
} else {
    header('X-Debug-Route-Other: YES');
    // All other routes require authentication
    $username = authenticateRequest();
    $userId = "mysql-$username";
    
    // Debug: Check if warehouse function exists at routing time
    if (function_exists('handleGetWarehouses')) {
        header('X-Debug-Warehouse-Function-Routing: Found');
    } else {
        header('X-Debug-Warehouse-Function-Routing: Missing');
    }
    
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
    } elseif (preg_match('#/api\.php/api/customers/([a-f0-9\-]+)/history$#', $path, $matches) || preg_match('#/api/customers/([a-f0-9\-]+)/history$#', $path, $matches)) {
        $customerId = $matches[1];
        if ($requestMethod === 'GET') {
            if (function_exists('handleGetCustomerHistory')) {
                handleGetCustomerHistory($userId, $customerId);
            } else {
                sendError(500, "Get customer history function not found");
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

// ==================== INCLUDE PHASE 1 HANDLERS ====================
header('X-Debug-Step: 4-Including-Handlers');
if (file_exists(__DIR__ . '/phase1_handlers.php')) {
    require_once __DIR__ . '/phase1_handlers.php';
    header('X-Debug-Phase1-Handlers: Loaded');
} else {
    header('X-Debug-Phase1-Handlers: Not-Found');
}

if (file_exists(__DIR__ . '/phase1_handlers_part2.php')) {
    require_once __DIR__ . '/phase1_handlers_part2.php';
    header('X-Debug-Phase1-Handlers-Part2: Loaded');
} else {
    header('X-Debug-Phase1-Handlers-Part2: Not-Found');
}

if (file_exists(__DIR__ . '/phase1_handlers_part3.php')) {
    require_once __DIR__ . '/phase1_handlers_part3.php';
    header('X-Debug-Phase1-Handlers-Part3: Loaded');
} else {
    header('X-Debug-Phase1-Handlers-Part3: Not-Found');
}
header('X-Debug-Step: 5-Handlers-Included');

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
    header('X-Debug-Handle-Login: Start');
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    header('X-Debug-Login-Input-Username: ' . $username);
    header('X-Debug-Login-Input-Password: ' . (empty($password) ? 'EMPTY' : 'PRESENT'));

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
            'username' => $username,
            'access_token' => $token,
            'token_type' => 'bearer',
            'user_id' => "mysql-" . $username
        ]);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, password_hash, role, created_at FROM auth_users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            sendError(401, "Invalid credentials");
        }

        if (!verifyUserPassword($password, $user['password_hash'])) {
            sendError(401, "Invalid credentials");
        }

        $token = generateToken($username);
        sendSuccess([
            'token' => $token,
            'username' => $username,
            'access_token' => $token,
            'token_type' => 'bearer',
            'user_id' => "mysql-" . $username
        ]);
    } catch (Exception $e) {
        sendError(500, "Login failed: " . $e->getMessage());
    }
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
    
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            INSERT INTO products (id, user_id, name, sku, selling_price, cost_price, stock, min_stock, category_id, packing_unit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $initialStock = $input['initial_stock'] ?? 0;
        
        $stmt->execute([
            $id,
            $userId,
            $input['name'],
            $input['sku'],
            $input['selling_price'],
            $input['cost_price'],
            $initialStock,
            $input['min_stock'],
            $input['category_id'],
            $input['packing_unit']
        ]);
        
        // Create stock_levels entry for default warehouse if initial stock > 0
        if ($initialStock > 0) {
            $warehouseId = $input['warehouse_id'] ?? 1; // Default to main warehouse
            $stmt = $pdo->prepare("
                INSERT INTO stock_levels (product_id, warehouse_id, quantity, reserved_quantity, updated_at)
                VALUES (?, ?, ?, 0, NOW())
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $stmt->execute([$id, $warehouseId, $initialStock]);
        }
        
        $pdo->commit();
        
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetch(), 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(500, "Failed to create product: " . $e->getMessage());
    }
}

function handleUpdateProduct($userId, $productId, $input) {
    $pdo = getDBConnection();

    try {
        $pdo->beginTransaction();
        
        // Get current prices for price history
        $stmt = $pdo->prepare("SELECT cost_price, selling_price FROM products WHERE id = ? AND user_id = ?");
        $stmt->execute([$productId, $userId]);
        $currentProduct = $stmt->fetch();
        
        if (!$currentProduct) {
            throw new Exception("Product not found");
        }
        
        $oldCostPrice = $currentProduct['cost_price'];
        $oldSellingPrice = $currentProduct['selling_price'];
        $newCostPrice = $input['cost_price'];
        $newSellingPrice = $input['selling_price'];
        
        // Update product
        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, sku = ?, selling_price = ?, cost_price = ?, min_stock = ?, category_id = ?, packing_unit = ?
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $input['name'],
            $input['sku'],
            $newSellingPrice,
            $newCostPrice,
            $input['min_stock'],
            $input['category_id'],
            $input['packing_unit'],
            $productId,
            $userId
        ]);
        
        // Log price changes to price_history if prices changed
        if ($oldCostPrice != $newCostPrice || $oldSellingPrice != $newSellingPrice) {
            $stmt = $pdo->prepare("
                INSERT INTO price_history (product_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price, changed_by, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $productId,
                $oldCostPrice,
                $newCostPrice,
                $oldSellingPrice,
                $newSellingPrice,
                $userId
            ]);
        }
        
        $pdo->commit();
        
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        sendSuccess($stmt->fetch());
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(500, "Failed to update product: " . $e->getMessage());
    }
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
    
    // Validate customer name is present
    if (empty($input['customer_name'])) {
        sendError(400, "Customer name is required");
    }
    
    try {
        $pdo->beginTransaction();
        
        // Handle Customer Linkage
        $customerId = $input['customer_id'] ?? null;
        
        if (!$customerId) {
            // Try to find existing customer by name
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE name = ?");
            $stmt->execute([$input['customer_name']]);
            $existingCustomer = $stmt->fetch();
            
            if ($existingCustomer) {
                $customerId = $existingCustomer['id'];
            } else {
                // Create new customer
                $customerId = generateUUID();
                // Generate a simple code if not provided (e.g., CUST-TIMESTAMP)
                $customerCode = 'CUST-' . time() . '-' . substr($customerId, 0, 4);
                
                $stmt = $pdo->prepare("INSERT INTO customers (id, customer_code, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
                $stmt->execute([
                    $customerId,
                    $customerCode,
                    $input['customer_name'],
                    $input['customer_phone'] ?? null,
                    $input['customer_address'] ?? null
                ]);
            }
        }

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
            INSERT INTO invoices (id, invoice_number, user_id, customer_id, customer_name, customer_phone, customer_address, 
                deliveryman_name, subtotal, total, discount_percentage, final_discount_amount, final_total_amount, sale_timestamp, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        ");
        
        $stmt->execute([
            $invoiceId,
            $invoiceNumber,
            $userId,
            $customerId,
            $input['customer_name'],
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
    
    // Validate customer name is present
    if (empty($input['customer_name'])) {
        sendError(400, "Customer name is required");
    }
    
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
        
        // Handle Customer Linkage
        $customerId = $input['customer_id'] ?? null;
        
        if (!$customerId) {
            // Try to find existing customer by name
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE name = ?");
            $stmt->execute([$input['customer_name']]);
            $existingCustomer = $stmt->fetch();
            
            if ($existingCustomer) {
                $customerId = $existingCustomer['id'];
            } else {
                // Create new customer
                $customerId = generateUUID();
                $customerCode = 'CUST-' . time() . '-' . substr($customerId, 0, 4);
                
                $stmt = $pdo->prepare("INSERT INTO customers (id, customer_code, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
                $stmt->execute([
                    $customerId,
                    $customerCode,
                    $input['customer_name'],
                    $input['customer_phone'] ?? null,
                    $input['customer_address'] ?? null
                ]);
            }
        }

        // Update invoice
        $stmt = $pdo->prepare("
            UPDATE invoices SET customer_id = ?, customer_name = ?, customer_phone = ?, customer_address = ?,
                deliveryman_name = ?, subtotal = ?, total = ?, discount_percentage = ?,
                final_discount_amount = ?, final_total_amount = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $customerId,
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
    
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(final_total_amount), 0) as revenue FROM invoices WHERE user_id = ? AND is_deleted = 0");
    $stmt->execute([$userId]);
    $revenue = $stmt->fetch()['revenue'] ?? 0;
    
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(final_discount_amount), 0) as discount FROM invoices WHERE user_id = ? AND is_deleted = 0");
    $stmt->execute([$userId]);
    $totalDiscount = $stmt->fetch()['discount'] ?? 0;
    
    // Calculate Net Profit (Revenue - COGS)
    // COGS = SUM(quantity * cost_price) for all sold items
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(ii.quantity * IFNULL(p.cost_price, 0)), 0) as cogs
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN products p ON ii.product_id = p.id
        WHERE i.user_id = ? AND i.is_deleted = 0
    ");
    $stmt->execute([$userId]);
    $cogsResult = $stmt->fetch();
    $cogs = $cogsResult['cogs'] ?? 0;
    
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

function handleUpdateRestock($userId, $restockId, $input) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Get original restock items
        $stmt = $pdo->prepare("SELECT * FROM restock_items WHERE restock_id = ?");
        $stmt->execute([$restockId]);
        $originalItems = $stmt->fetchAll();
        
        // Reverse original stock additions
        foreach ($originalItems as $item) {
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$item['quantity'], $item['product_id']]);
        }
        
        // Delete old items
        $stmt = $pdo->prepare("DELETE FROM restock_items WHERE restock_id = ?");
        $stmt->execute([$restockId]);
        
        $totalRestockValue = 0;
        $totalItemsRestocked = 0;
        
        // Process each item in the restock
        foreach ($input['items'] as $item) {
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
            $stmt = $pdo->prepare("
                INSERT INTO restock_items 
                (id, restock_id, product_id, product_name, packing_unit, quantity, cost_per_unit, total_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                generateUUID(),
                $restockId,
                $productId,
                $itemName,
                $packingUnit,
                $quantity,
                $costPerUnit,
                $itemValue
            ]);

            // Add new stock
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            $stmt->execute([$quantity, $productId]);
        }
        
        // Update restock transaction header
        $stmt = $pdo->prepare("
            UPDATE restock_transactions 
            SET total_restock_value = ?, total_items_restocked = ?, booker_name = ?, deliveryman_name = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([
            $totalRestockValue,
            $totalItemsRestocked,
            $input['booker_name'],
            $input['deliveryman_name'],
            $restockId,
            $userId
        ]);
        
        $pdo->commit();
        sendSuccess(['message' => 'Restock updated']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
}

function handleDeleteRestock($userId, $restockId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        // Ensure soft-delete column exists (in case migration hasn't been run)
        try {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM restock_transactions LIKE 'deleted_at'");
            $stmt->execute();
            $col = $stmt->fetch();
            if (!$col) {
                $pdo->exec("ALTER TABLE restock_transactions ADD COLUMN deleted_at datetime NULL DEFAULT NULL AFTER updated_at");
            }
        } catch (Exception $e) {
            // Proceed even if we cannot add the column; deletion request will fail gracefully
        }
        
        // Get restock items
        $stmt = $pdo->prepare("SELECT * FROM restock_items WHERE restock_id = ?");
        $stmt->execute([$restockId]);
        $items = $stmt->fetchAll();
        
        // Restore stock
        foreach ($items as $item) {
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$item['quantity'], $item['product_id']]);
        }
        
        // Soft-delete the restock transaction record
        $stmt = $pdo->prepare("UPDATE restock_transactions SET deleted_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$restockId, $userId]);
        
        $pdo->commit();
        sendSuccess(['message' => 'Restock deleted']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError(400, $e->getMessage());
    }
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
