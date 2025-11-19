<?php
// Database Configuration
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'realgiveaways_inventory');
define('DB_USER', getenv('DB_USER') ?: 'realgiveaways_inventory');
define('DB_PASS', getenv('DB_PASS') ?: '%x6!bSJXCc&O}0+p');

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
    
    if (!$restockTableExists) {
        // Create restock_transactions table
        $stmt = $pdo->prepare("
            CREATE TABLE restock_transactions (
                id varchar(36) NOT NULL,
                user_id varchar(36) NOT NULL,
                restock_number varchar(50) NOT NULL UNIQUE,
                restock_timestamp datetime NOT NULL,
                total_restock_value decimal(10,2) NOT NULL DEFAULT 0.00,
                total_items_restocked int NOT NULL DEFAULT 0,
                booker_name varchar(255) DEFAULT NULL,
                deliveryman_name varchar(255) DEFAULT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY restock_number (restock_number),
                KEY user_id (user_id),
                KEY restock_timestamp (restock_timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $stmt->execute();
        echo "Created restock_transactions table\n";
    } else {
        echo "restock_transactions table already exists\n";
        
        // Add deliveryman_name column if it doesn't exist
        $stmt = $pdo->prepare("SHOW COLUMNS FROM restock_transactions LIKE 'deliveryman_name'");
        $stmt->execute();
        $columnExists = $stmt->fetch();
        
        if (!$columnExists) {
            $stmt = $pdo->prepare("ALTER TABLE restock_transactions ADD COLUMN deliveryman_name varchar(255) DEFAULT NULL AFTER booker_name");
            $stmt->execute();
            echo "Added deliveryman_name column to restock_transactions table\n";
        } else {
            echo "deliveryman_name column already exists\n";
        }
        
        // Drop items_json column if it exists
        $stmt = $pdo->prepare("SHOW COLUMNS FROM restock_transactions LIKE 'items_json'");
        $stmt->execute();
        $columnExists = $stmt->fetch();
        
        if ($columnExists) {
            $stmt = $pdo->prepare("ALTER TABLE restock_transactions DROP COLUMN items_json");
            $stmt->execute();
            echo "Dropped items_json column from restock_transactions table\n";
        } else {
            echo "items_json column already dropped\n";
        }

        // Add deleted_at column for soft deletes if it doesn't exist
        $stmt = $pdo->prepare("SHOW COLUMNS FROM restock_transactions LIKE 'deleted_at'");
        $stmt->execute();
        $deletedAtExists = $stmt->fetch();
        if (!$deletedAtExists) {
            $stmt = $pdo->prepare("ALTER TABLE restock_transactions ADD COLUMN deleted_at datetime NULL DEFAULT NULL AFTER updated_at");
            $stmt->execute();
            echo "Added deleted_at column to restock_transactions table\n";
        } else {
            echo "deleted_at column already exists\n";
        }
    }
    
    // Create restock_items table if it doesn't exist
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'restock_items'");
    $stmt->execute();
    $restockItemsTableExists = $stmt->fetch();
    
    if (!$restockItemsTableExists) {
        $stmt = $pdo->prepare("
            CREATE TABLE restock_items (
                id varchar(36) NOT NULL,
                restock_id varchar(36) NOT NULL,
                product_id varchar(36) NOT NULL,
                product_name varchar(255) NOT NULL,
                packing_unit varchar(50) DEFAULT NULL,
                quantity int NOT NULL DEFAULT 0,
                cost_per_unit decimal(10,2) NOT NULL DEFAULT 0.00,
                total_cost decimal(10,2) NOT NULL DEFAULT 0.00,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY restock_id (restock_id),
                KEY product_id (product_id),
                CONSTRAINT fk_restock_items_restock_id FOREIGN KEY (restock_id) REFERENCES restock_transactions (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $stmt->execute();
        echo "Created restock_items table\n";
    } else {
        echo "restock_items table already exists\n";
    }

    // Run market supply migration
    $market_supply_migration_script = file_get_contents('market_supply_migration.sql');
    if ($market_supply_migration_script) {
        $pdo->exec($market_supply_migration_script);
        echo "Executed market_supply_migration.sql\n";
    } else {
        echo "Could not read market_supply_migration.sql\n";
    }
    
    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>