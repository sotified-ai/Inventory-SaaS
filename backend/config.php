<?php
// Configuration file for switching between local and live environments
// Set ENVIRONMENT to 'local' or 'live' to switch configurations

// Default environment (can be overridden by .env file)

// Configuration arrays for different environments
$config = [
  
    'live' => [
       
        'DB_NAME' => isset($envVars['DB_NAME']) ? $envVars['DB_NAME'] : (getenv('DB_NAME') ?: 'realgiveaways_inventory'),
        'DB_USER' => isset($envVars['DB_USER']) ? $envVars['DB_USER'] : (getenv('DB_USER') ?: 'realgiveaways_inventory'),
        'DB_PASS' => isset($envVars['DB_PASSWORD']) ? $envVars['DB_PASSWORD'] : (getenv('DB_PASSWORD') ?: '!nv3T0rY'),
        'APP_SECRET' => isset($envVars['APP_SECRET']) ? $envVars['APP_SECRET'] : (getenv('APP_SECRET') ?: 'inventory-saas-secret-key-change-in-production'),
        'DB_PORT' => isset($envVars['DB_PORT']) ? (int)$envVars['DB_PORT'] : (getenv('DB_PORT') ?: 3306),
        'DB_ENGINE' => isset($envVars['DB_ENGINE']) ? $envVars['DB_ENGINE'] : (getenv('DB_ENGINE') ?: 'mysql'),
        'CORS_ORIGINS' => isset($envVars['CORS_ORIGINS']) ? $envVars['CORS_ORIGINS'] : (getenv('CORS_ORIGINS') ?: 'https://realgiveaways.com,http://realgiveaways.com')
    ]
];

// Get configuration for current environment


?>