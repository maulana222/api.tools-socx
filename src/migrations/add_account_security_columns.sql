-- Add account security columns to users table
-- This migration adds columns for account locking, login attempts tracking, and security logging

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE COMMENT 'Whether the account is currently locked',
ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL COMMENT 'Timestamp until which the account is locked',
ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0 COMMENT 'Number of failed login attempts',
ADD COLUMN IF NOT EXISTS last_login_attempt DATETIME NULL COMMENT 'Timestamp of last login attempt',
ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL COMMENT 'Timestamp of successful login',
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL COMMENT 'IP address of last successful login';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_login_attempts ON users(login_attempts);