<?php
// Check if PDO is available
if (!extension_loaded('pdo')) {
    echo "PDO is NOT available\n";
} else {
    echo "PDO is available\n";
    
    // Check if PDO MySQL driver is available
    $drivers = PDO::getAvailableDrivers();
    if (in_array('mysql', $drivers)) {
        echo "PDO MySQL driver is available\n";
    } else {
        echo "PDO MySQL driver is NOT available\n";
        echo "Available drivers: " . implode(', ', $drivers) . "\n";
    }
}
?>