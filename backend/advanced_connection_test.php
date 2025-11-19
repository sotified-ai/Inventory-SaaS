<?php
// Test database connection with different user host combinations

echo "Testing database connection with different approaches:\n";

// Test 1: Using the exact credentials you provided
$host = 'localhost';
$dbname = 'realgiveaways_inventory';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "\n1. Testing with exact credentials:\n";
echo "Host: $host\n";
echo "Database: $dbname\n";
echo "Username: $username\n";
echo "Password: $password\n";

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    echo "DSN: $dsn\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "SUCCESS: Database connection established!\n";
    
} catch (PDOException $e) {
    echo "FAILED: Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
}

// Test 2: Try with persistent connection
echo "\n2. Testing with persistent connection:\n";
try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    echo "DSN: $dsn\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => true
    ]);
    
    echo "SUCCESS: Database connection with persistent connection established!\n";
    
} catch (PDOException $e) {
    echo "FAILED: Database connection with persistent connection failed: " . $e->getMessage() . "\n";
}

// Test 3: Try without specifying charset
echo "\n3. Testing without specifying charset:\n";
try {
    $dsn = "mysql:host=$host;dbname=$dbname";
    echo "DSN: $dsn\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "SUCCESS: Database connection without charset established!\n";
    
} catch (PDOException $e) {
    echo "FAILED: Database connection without charset failed: " . $e->getMessage() . "\n";
}
?>