<?php
// Simple test to check if users.json file is correctly formatted

echo "Checking users.json file...\n";

$usersFile = __DIR__ . '/users.json';
if (!file_exists($usersFile)) {
    echo "ERROR: users.json file not found\n";
    exit(1);
}

$content = file_get_contents($usersFile);
$users = json_decode($content, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "ERROR: users.json is not valid JSON: " . json_last_error_msg() . "\n";
    exit(1);
}

echo "users.json is valid JSON\n";
echo "Users found: " . implode(', ', array_keys($users)) . "\n";

// Check if admin user exists
if (isset($users['admin'])) {
    echo "Admin user found\n";
    echo "Password hash: " . $users['admin']['password'] . "\n";
} else {
    echo "WARNING: Admin user not found\n";
}

echo "Test completed successfully\n";