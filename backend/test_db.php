<?php
// Test script to verify database connection and user table
require_once 'config.php';

try {
    echo "Testing database connection...\n";
    
    // Test database connection
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "Database connection successful!\n";
    
    // Check if auth_users table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'auth_users'");
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo "ERROR: auth_users table does not exist!\n";
        exit(1);
    }
    echo "auth_users table exists.\n";
    
    // Check for admin user
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "ERROR: Admin user not found!\n";
        exit(1);
    }
    echo "Admin user found: " . $user['username'] . "\n";
    echo "Password hash: " . $user['password_hash'] . "\n";
    
    echo "All database tests passed!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>