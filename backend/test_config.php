<?php
// Test script to verify configuration loading
require_once 'config.php';

echo "CURRENT_ENVIRONMENT: " . CURRENT_ENVIRONMENT . "\n";
echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "DB_PASS: " . DB_PASS . "\n";
echo "APP_SECRET: " . APP_SECRET . "\n";

// Test if DB_PASSWORD environment variable is set
$dbPassEnv = getenv('DB_PASSWORD');
echo "DB_PASSWORD env var: " . ($dbPassEnv ? $dbPassEnv : 'NOT SET') . "\n";
?>