<?php
// Test database connection script

// Load configuration
require_once 'config.php';

echo "Environment: " . CURRENT_ENVIRONMENT . "\n";
echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "DB_PASS: " . DB_PASS . "\n";
echo "DB_PASS Length: " . strlen(DB_PASS) . "\n";

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "Database connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM auth_users");
    $stmt->execute();
    $result = $stmt->fetch();
    echo "Number of users in auth_users table: " . $result['count'] . "\n";
    
} catch (PDOException $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
}
?>