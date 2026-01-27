-- Create table for blacklisted JWT tokens
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  reason VARCHAR(50) DEFAULT 'logout',
  user_id INT,
  created_at DATETIME NOT NULL,
  INDEX idx_token (token(255)),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;