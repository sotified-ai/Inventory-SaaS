<?php
// Direct test of login functionality without routing
require_once 'config.php';

function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

function verifyUserPassword($plain, $stored) {
    // Try bcrypt verification first (for properly hashed passwords)
    if (password_verify($plain, $stored)) {
        return true;
    }
    // Fallback to SHA-256 for legacy passwords
    return hash('sha256', $plain) === $stored;
}

function generateToken($username, $expiresIn = 43200) {
    $exp = time() + $expiresIn;
    $payload = "$username:$exp";
    $sig = base64_encode(hash_hmac('sha256', $payload, APP_SECRET, true));
    $token = base64_encode("$payload:$sig");
    return $token;
}

// Test the login process directly
$username = 'admin';
$password = 'admin';

echo "Testing login for user: $username\n";

try {
    $pdo = getDBConnection();
    echo "Database connection successful!\n";
    
    $stmt = $pdo->prepare("SELECT * FROM auth_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "ERROR: User not found!\n";
        exit(1);
    }
    
    echo "User found: " . $user['username'] . "\n";
    
    if (!verifyUserPassword($password, $user['password_hash'])) {
        echo "ERROR: Invalid password!\n";
        exit(1);
    }
    
    echo "Password verification successful!\n";
    
    $token = generateToken($username);
    echo "Token generated successfully\n";
    
    // Output success response
    $response = [
        'token' => $token,
        'username' => $username,
        'access_token' => $token,
        'token_type' => 'bearer',
        'user_id' => "mysql-$username"
    ];
    
    echo "Login successful!\n";
    echo json_encode($response) . "\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>