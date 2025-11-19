<?php
// Simple database connection test with hardcoded values

$host = 'localhost';
$dbname = 'realgiveaways_inventory';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "Testing connection with hardcoded values:\n";
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
    
    // Test a simple query
    $stmt = $pdo->prepare("SHOW TABLES");
    $stmt->execute();
    $tables = $stmt->fetchAll();
    echo "Database contains " . count($tables) . " tables\n";
    
} catch (PDOException $e) {
    echo "FAILED: Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
}
?>