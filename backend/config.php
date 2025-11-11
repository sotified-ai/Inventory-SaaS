<?php
// Configuration file for switching between local and live environments
// Set ENVIRONMENT to 'local' or 'live' to switch configurations

// Default environment (can be overridden by .env file)
defined('ENVIRONMENT') or define('ENVIRONMENT', 'live');

// Load environment variables from .env file if it exists
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $envVars = parse_ini_file($envFile, false, INI_SCANNER_RAW);
    if (isset($envVars['ENVIRONMENT'])) {
        define('CURRENT_ENVIRONMENT', $envVars['ENVIRONMENT']);
    } else {
        define('CURRENT_ENVIRONMENT', 'live');
    }
} else {
    define('CURRENT_ENVIRONMENT', 'live');
}

// Configuration arrays for different environments
$config = [
    'local' => [
        'DB_HOST' => 'localhost',
        'DB_NAME' => 'inventory',
        'DB_USER' => 'inv_user',
        'DB_PASS' => 'inv_pass',
        'APP_SECRET' => 'local-inventory-secret-key',
        'DB_PORT' => 3306
    ],
    'live' => [
        'DB_HOST' => 'localhost',
        'DB_NAME' => 'realgiveaways_inventory',
        'DB_USER' => 'realgiveaways_inventory',
        'DB_PASS' => 'x6bSJXCcO0p',
        'APP_SECRET' => 'inventory-saas-secret-key-change-in-production',
        'DB_PORT' => 3306
    ]
];

// Get configuration for current environment
$currentConfig = $config[CURRENT_ENVIRONMENT] ?? $config['live'];

// Define constants
define('DB_HOST', $currentConfig['DB_HOST']);
define('DB_NAME', $currentConfig['DB_NAME']);
define('DB_USER', $currentConfig['DB_USER']);
define('DB_PASS', $currentConfig['DB_PASS']);
define('APP_SECRET', $currentConfig['APP_SECRET']);
define('DB_PORT', $currentConfig['DB_PORT']);

// For compatibility with existing code that uses getenv()
putenv('DB_HOST=' . DB_HOST);
putenv('DB_NAME=' . DB_NAME);
putenv('DB_USER=' . DB_USER);
putenv('DB_PASS=' . DB_PASS);
putenv('APP_SECRET=' . APP_SECRET);
?>