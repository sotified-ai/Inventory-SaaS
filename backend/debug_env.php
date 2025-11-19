<?php
// Debug .env parsing

$envFile = __DIR__ . '/.env';
echo "Env file path: " . $envFile . "\n";
echo "File exists: " . (file_exists($envFile) ? 'YES' : 'NO') . "\n";

if (file_exists($envFile)) {
    $envVars = [];
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    echo "Lines in .env file: " . count($lines) . "\n";
    
    foreach ($lines as $line) {
        echo "Line: " . $line . "\n";
        if (strpos($line, '#') === 0 || empty($line)) {
            echo "  -> Skipping (comment or empty)\n";
            continue; // Skip comments and empty lines
        }
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            echo "  -> Key: " . $key . ", Value: " . $value . "\n";
            // Remove surrounding quotes if present
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
                echo "  -> Unquoted value: " . $value . "\n";
            }
            $envVars[$key] = $value;
        }
    }
    
    echo "\nParsed env vars:\n";
    foreach ($envVars as $key => $value) {
        echo "  " . $key . " = " . $value . " (length: " . strlen($value) . ")\n";
    }
    
    if (isset($envVars['DB_PASSWORD'])) {
        echo "\nDB_PASSWORD found: " . $envVars['DB_PASSWORD'] . "\n";
    } else {
        echo "\nDB_PASSWORD NOT found in env vars\n";
    }
}
?>