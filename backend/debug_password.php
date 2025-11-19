<?php
// Debug script to verify what password is being used
require_once 'config.php';

echo "CURRENT_ENVIRONMENT: " . CURRENT_ENVIRONMENT . "\n";
echo "DB_PASS: " . DB_PASS . "\n";
echo "DB_PASS length: " . strlen(DB_PASS) . "\n";

// Check if DB_PASSWORD environment variable is set
$dbPassEnv = getenv('DB_PASSWORD');
echo "DB_PASSWORD env var: " . ($dbPassEnv ? $dbPassEnv : 'NOT SET') . "\n";
echo "DB_PASSWORD env var length: " . ($dbPassEnv ? strlen($dbPassEnv) : 'N/A') . "\n";

// Check the .env file directly
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    echo "\n.env file contents:\n";
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, 'DB_PASSWORD') !== false) {
            echo $line . "\n";
            // Extract the value
            list($key, $value) = explode('=', $line, 2);
            $value = trim($value);
            echo "Raw value: " . $value . "\n";
            echo "Raw value length: " . strlen($value) . "\n";
            
            // Remove surrounding quotes if present
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
                echo "Value after removing quotes: " . $value . "\n";
                echo "Value length after removing quotes: " . strlen($value) . "\n";
            }
            break;
        }
    }
}
?>