<?php
// Final test to verify login functionality
require_once 'api.php';

// Simulate a login request
$input = [
    'username' => 'admin',
    'password' => 'admin123'
];

echo "Testing login with username: " . $input['username'] . "\n";

try {
    // Test database connection first
    $pdo = getDBConnection();
    echo "Database connection successful!\n";
    
    // Test the handleLogin function directly
    echo "Calling handleLogin function...\n";
    handleLogin($input);
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>