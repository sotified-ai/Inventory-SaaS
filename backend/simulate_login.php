<?php
// Test the login functionality directly

// Set up the input data
$input = [
    'username' => 'admin',
    'password' => 'admin123'
];

// Capture the output
ob_start();

// Load configuration
require_once 'config.php';

// Include the functions we need
require_once 'api.php';

// Test the handleLogin function directly
handleLogin($input);

// Get the output
$output = ob_get_clean();

// Display the output
echo "Output:\n";
echo $output;

// Display any headers that were set
echo "\nHeaders:\n";
foreach (headers_list() as $header) {
    echo $header . "\n";
}
?>