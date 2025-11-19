<?php
// Test script to verify database connection with exact credentials
echo "Testing database connection with exact credentials...\n";

try {
    $host = 'localhost';
    $dbname = 'realgiveaways_inventory';
    $username = 'realgiveaways_inventory';
    $password = '!nv3T0rY';
    
    echo "Attempting to connect with:\n";
    echo "Host: $host\n";
    echo "Database: $dbname\n";
    echo "User: $username\n";
    echo "Password length: " . strlen($password) . "\n";
    
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    echo "DSN: $dsn\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "Database connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM auth_users");
    $result = $stmt->fetch();
    echo "Number of users in auth_users table: " . $result['count'] . "\n";
    
} catch (PDOException $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>