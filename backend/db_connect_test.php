<?php
// Test database connection with properly escaped password
echo "Testing database connection with escaped password...\n";

try {
    // Manually set the credentials
    $host = 'localhost';
    $dbname = 'realgiveaways_inventory';
    $username = 'realgiveaways_inventory';
    $password = '!nv3T0rY'; // The actual password with special characters
    
    echo "Attempting to connect with:\n";
    echo "Host: $host\n";
    echo "Database: $dbname\n";
    echo "User: $username\n";
    echo "Password length: " . strlen($password) . "\n";
    
    // Create DSN with proper escaping
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    
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
    
    echo "All tests passed!\n";
    
} catch (PDOException $e) {
    echo "DATABASE ERROR: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "GENERAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>