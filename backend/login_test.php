<?php
// Test login functionality

// Load configuration
require_once 'config.php';

echo "Environment: " . CURRENT_ENVIRONMENT . "\n";
echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "DB_PASS: " . DB_PASS . "\n";

// Test database connection directly
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "SUCCESS: Database connection established!\n";
    
    // Test login query
    $username = 'admin';
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "SUCCESS: Found user '$username' in database\n";
        echo "User data: " . json_encode($user) . "\n";
    } else {
        echo "WARNING: User '$username' not found in database\n";
        
        // Check if any users exist
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM auth_users");
        $stmt->execute();
        $result = $stmt->fetch();
        echo "Total users in database: " . $result['count'] . "\n";
    }
    
} catch (PDOException $e) {
    echo "FAILED: Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
}
?>