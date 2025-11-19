-- Create auth_users table for MySQL backend
-- This table is used for authentication in the PHP API

CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Username: admin
-- Password: admin123 (hashed using SHA256 via MySQL function)
INSERT IGNORE INTO `auth_users` (`username`, `password_hash`, `role`)
VALUES ('admin', SHA2('admin123', 256), 'admin');

-- Verify the user was created
SELECT * FROM `auth_users` WHERE `username` = 'admin';