<?php
// Test password with special characters

$host = 'localhost';
$dbname = 'realgiveaways_inventory';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "Testing password handling:\n";
echo "Password: $password\n";
echo "Password length: " . strlen($password) . "\n";
echo "Password bytes: " . bin2hex($password) . "\n";

// Test with the password as a literal string
echo "\nTesting with literal password string:\n";
try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, '!nv3T0rY', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with literal password string\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test with the password as a variable
echo "\nTesting with password as variable:\n";
try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    echo "SUCCESS: Connected with password as variable\n";
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
?>