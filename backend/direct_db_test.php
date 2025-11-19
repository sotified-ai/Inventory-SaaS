<?php
// Direct test of the database connection function

// Load configuration
require_once 'config.php';

// Include the database connection function
require_once 'api.php';

echo "Testing direct database connection:\n";
echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "DB_PASS: " . DB_PASS . "\n";

try {
    $pdo = getDBConnection();
    echo "SUCCESS: Database connection established!\n";
    
    // Test a simple query
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM auth_users");
    $stmt->execute();
    $result = $stmt->fetch();
    echo "Number of users in auth_users table: " . $result['count'] . "\n";
    
} catch (Exception $e) {
    echo "FAILED: Database connection failed: " . $e->getMessage() . "\n";
}
?>