<?php
// Test different MySQL connection approaches

$host = 'localhost';
$dbname = 'realgiveaways_inventory';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "Testing different MySQL connection approaches:\n";

// Test 1: Standard connection
echo "\n1. Standard connection:\n";
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Standard connection\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 2: Connection with 127.0.0.1 instead of localhost
echo "\n2. Connection with 127.0.0.1:\n";
try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connection with 127.0.0.1\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 3: Connection without specifying charset
echo "\n3. Connection without charset:\n";
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connection without charset\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 4: Connection with different charset
echo "\n4. Connection with utf8 charset:\n";
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connection with utf8 charset\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
?>