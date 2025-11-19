<?php
// Simple test to verify database connection with the actual password
try {
    echo "Testing database connection with direct credentials...\n";
    
    // Use the actual password with special characters
    $dsn = "mysql:host=localhost;dbname=realgiveaways_inventory;charset=utf8mb4";
    $pdo = new PDO($dsn, 'realgiveaways_inventory', '!nv3T0rY', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "Database connection successful!\n";
    
    // Check for admin user
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "ERROR: Admin user not found!\n";
        exit(1);
    }
    echo "Admin user found: " . $user['username'] . "\n";
    
    echo "All tests passed!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>