<?php
// Test MySQL user configuration

echo "Testing MySQL user configuration:\n";

// Try to connect to MySQL without specifying a database to check user permissions
try {
    $pdo = new PDO("mysql:host=localhost;charset=utf8mb4", 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "SUCCESS: Connected to MySQL as root\n";
    
    // Check if the user exists and what hosts it can connect from
    $stmt = $pdo->prepare("SELECT User, Host FROM mysql.user WHERE User = 'realgiveaways_inventory'");
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    if (count($users) > 0) {
        echo "User 'realgiveaways_inventory' exists with the following host permissions:\n";
        foreach ($users as $user) {
            echo "  User: " . $user['User'] . ", Host: " . $user['Host'] . "\n";
        }
    } else {
        echo "User 'realgiveaways_inventory' does not exist in MySQL\n";
    }
    
    // Check if the database exists
    $stmt = $pdo->prepare("SHOW DATABASES LIKE 'realgiveaways_inventory'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result) {
        echo "Database 'realgiveaways_inventory' exists\n";
    } else {
        echo "Database 'realgiveaways_inventory' does not exist\n";
    }
    
} catch (PDOException $e) {
    echo "Could not connect as root: " . $e->getMessage() . "\n";
    
    // Try with no password
    try {
        $pdo = new PDO("mysql:host=localhost;charset=utf8mb4", 'root', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        
        echo "SUCCESS: Connected to MySQL as root (no password)\n";
    } catch (PDOException $e2) {
        echo "Could not connect as root (no password): " . $e2->getMessage() . "\n";
    }
}
?>