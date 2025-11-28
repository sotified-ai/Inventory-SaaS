<?php
// Test database connection
require_once 'api.php';

echo "Testing database connection...\n";

try {
    $pdo = getDBConnection();
    echo "Database connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->prepare("SELECT 1 as test");
    $stmt->execute();
    $result = $stmt->fetch();
    echo "Simple query result: " . print_r($result, true) . "\n";
} catch (Exception $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
}