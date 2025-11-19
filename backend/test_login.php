<?php
// Test script to verify login functionality
require_once 'api.php';

try {
    echo "Testing login functionality...\n";
    
    // Simulate login input
    $input = [
        'username' => 'admin',
        'password' => 'admin123'
    ];
    
    echo "Attempting to login with username: " . $input['username'] . "\n";
    
    // Test database connection
    $pdo = getDBConnection();
    echo "Database connection successful!\n";
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute([$input['username']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "ERROR: User not found!\n";
        exit(1);
    }
    
    echo "User found: " . $user['username'] . "\n";
    
    // Test password verification
    if (!verifyUserPassword($input['password'], $user['password_hash'])) {
        echo "ERROR: Invalid password!\n";
        exit(1);
    }
    
    echo "Password verification successful!\n";
    
    // Test token generation
    $token = generateToken($input['username']);
    echo "Token generated successfully: " . substr($token, 0, 20) . "...\n";
    
    echo "All login tests passed!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>