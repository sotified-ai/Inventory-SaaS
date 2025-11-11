<?php
// Password Hash Generator for Inventory SaaS
// This script generates a proper hash for the admin user

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    
    if (empty($password)) {
        echo "Error: Password is required";
        exit;
    }
    
    // Generate hash using the same method as in api.php
    $hash = hash('sha256', $password);
    
    echo "<h2>Generated SHA256 Hash:</h2>";
    echo "<p><strong>Password:</strong> " . htmlspecialchars($password) . "</p>";
    echo "<p><strong>Hash:</strong> " . $hash . "</p>";
    echo "<p>Use this hash in your SQL update:</p>";
    echo "<pre>UPDATE auth_users SET password_hash = '" . $hash . "' WHERE username = 'admin';</pre>";
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Password Hash Generator</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        form { margin: 20px 0; }
        input[type="password"] { padding: 8px; width: 200px; }
        input[type="submit"] { padding: 8px 16px; background: #007cba; color: white; border: none; cursor: pointer; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Password Hash Generator</h1>
    <p>Generate SHA256 hash for admin password:</p>
    
    <form method="POST">
        <label for="password">Enter Password:</label><br>
        <input type="password" id="password" name="password" required><br><br>
        <input type="submit" value="Generate Hash">
    </form>
</body>
</html>