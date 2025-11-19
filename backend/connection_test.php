<?php
// Test different connection methods

$host = 'localhost';
$dbname = 'realgiveaways_inventory';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "Testing different connection methods:\n";

// Test 1: localhost
echo "\n1. Testing with localhost:\n";
try {
    $dsn = "mysql:host=localhost;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with localhost\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 2: 127.0.0.1
echo "\n2. Testing with 127.0.0.1:\n";
try {
    $dsn = "mysql:host=127.0.0.1;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with 127.0.0.1\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 3: With port specified
echo "\n3. Testing with localhost and port 3306:\n";
try {
    $dsn = "mysql:host=localhost;port=3306;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with localhost and port 3306\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 4: With different charset
echo "\n4. Testing with different charset:\n";
try {
    $dsn = "mysql:host=localhost;dbname=$dbname;charset=utf8";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with utf8 charset\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
?>