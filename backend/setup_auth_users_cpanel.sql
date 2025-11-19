-- Auth schema for cPanel: creates auth_users and seeds default admin
-- Run this in phpMyAdmin (Import) or MySQL CLI before using MySQL login

CREATE TABLE IF NOT EXISTS auth_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed a default admin user (SHA-256 of 'admin')
INSERT IGNORE INTO auth_users (username, password_hash, role)
VALUES ('admin', SHA2('admin123', 256), 'admin');

-- To change the password later, update with:
-- UPDATE auth_users SET password_hash = SHA2('<new_password>', 256) WHERE username = 'admin';