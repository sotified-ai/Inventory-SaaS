<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'realgiveaways_inventory');
define('DB_USER', 'root');
define('DB_PASS', '');

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // Check if restock_transactions table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'restock_transactions'");
    $stmt->execute();
    $restockTableExists = $stmt->fetch();
    
    if ($restockTableExists) {
        echo "restock_transactions table exists\n";
        
        // Check the structure of restock_transactions table
        $stmt = $pdo->prepare("DESCRIBE restock_transactions");
        $stmt->execute();
        $columns = $stmt->fetchAll();
        
        echo "restock_transactions table structure:\n";
        foreach ($columns as $column) {
            echo "- " . $column['Field'] . " (" . $column['Type'] . ")\n";
        }
        
        // Check if restock_items table exists
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'restock_items'");
        $stmt->execute();
        $restockItemsTableExists = $stmt->fetch();
        
        if ($restockItemsTableExists) {
            echo "\nrestock_items table exists\n";
            
            // Check the structure of restock_items table
            $stmt = $pdo->prepare("DESCRIBE restock_items");
            $stmt->execute();
            $columns = $stmt->fetchAll();
            
            echo "restock_items table structure:\n";
            foreach ($columns as $column) {
                echo "- " . $column['Field'] . " (" . $column['Type'] . ")\n";
            }
        } else {
            echo "\nrestock_items table does not exist\n";
        }
    } else {
        echo "restock_transactions table does not exist\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>