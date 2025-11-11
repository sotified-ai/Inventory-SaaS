<?php
// Test script to verify database connection and authentication
require_once 'api.php';

try {
    echo "Testing database connection...\n";
    $pdo = getDBConnection();
    echo "Database connection successful!\n";
    
    echo "Checking if auth_users table exists...\n";
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'auth_users'");
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo "ERROR: auth_users table does not exist!\n";
        exit(1);
    }
    echo "auth_users table exists.\n";
    
    echo "Checking for admin user...\n";
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "ERROR: Admin user not found!\n";
        exit(1);
    }
    echo "Admin user found: " . $user['username'] . "\n";
    echo "Password hash: " . $user['password_hash'] . "\n";
    
    echo "Testing password verification...\n";
    $testPassword = 'admin';
    $isCorrect = verifyUserPassword($testPassword, $user['password_hash']);
    
    if ($isCorrect) {
        echo "Password verification successful!\n";
    } else {
        echo "ERROR: Password verification failed!\n";
        exit(1);
    }
    
    echo "All tests passed!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>