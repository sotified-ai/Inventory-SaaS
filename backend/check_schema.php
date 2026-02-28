<?php
$host = 'localhost';
$db   = 'inventory_saas';
$user = 'inv';
$pass = 'inv07';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    echo "Connected successfully\n";
    
    echo "\nColumns in 'invoices' table:\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM invoices");
    while ($row = $stmt->fetch()) {
        echo $row['Field'] . "\n";
    }

} catch (\PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
