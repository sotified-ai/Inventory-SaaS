<?php
// Test if we can connect to MySQL server to check users

$host = 'localhost';
$username = 'realgiveaways_inventory';
$password = '!nv3T0rY';

echo "Attempting to connect to MySQL server to check if user exists...\n";

// Try connecting without specifying a database first
try {
    $dsn = "mysql:host=$host;charset=utf8mb4";
    echo "DSN: $dsn\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "SUCCESS: Connected to MySQL server!\n";
    
    // Check if we can see the database
    $stmt = $pdo->prepare("SHOW DATABASES LIKE 'realgiveaways_inventory'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result) {
        echo "SUCCESS: Database 'realgiveaways_inventory' exists!\n";
    } else {
        echo "WARNING: Database 'realgiveaways_inventory' does not exist!\n";
    }
    
    // Check user privileges
    try {
        $stmt = $pdo->prepare("SHOW GRANTS FOR CURRENT_USER()");
        $stmt->execute();
        $grants = $stmt->fetchAll();
        echo "User privileges:\n";
        foreach ($grants as $grant) {
            echo "  " . array_values($grant)[0] . "\n";
        }
    } catch (Exception $e) {
        echo "Could not retrieve user privileges: " . $e->getMessage() . "\n";
    }
    
} catch (PDOException $e) {
    echo "FAILED: Could not connect to MySQL server: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
    
    // Try with root user to see if we can get more information
    echo "\nTrying with root user to get more information...\n";
    try {
        $root_pdo = new PDO("mysql:host=$host;charset=utf8mb4", 'root', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        
        echo "SUCCESS: Connected as root!\n";
        
        // Check if the user exists
        $stmt = $root_pdo->prepare("SELECT User, Host FROM mysql.user WHERE User = 'realgiveaways_inventory'");
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        if (count($users) > 0) {
            echo "SUCCESS: User 'realgiveaways_inventory' exists!\n";
            foreach ($users as $user) {
                echo "  User: " . $user['User'] . ", Host: " . $user['Host'] . "\n";
            }
        } else {
            echo "WARNING: User 'realgiveaways_inventory' does not exist!\n";
        }
        
        // Check if database exists
        $stmt = $root_pdo->prepare("SHOW DATABASES LIKE 'realgiveaways_inventory'");
        $stmt->execute();
        $result = $stmt->fetch();
        
        if ($result) {
            echo "SUCCESS: Database 'realgiveaways_inventory' exists!\n";
        } else {
            echo "WARNING: Database 'realgiveaways_inventory' does not exist!\n";
        }
        
    } catch (PDOException $e2) {
        echo "Could not connect as root either: " . $e2->getMessage() . "\n";
    }
}
?>