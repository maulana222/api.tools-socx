# Database Setup Guide

## Prerequisites

- MySQL v8.0 or higher
- MySQL root access or user with CREATE DATABASE privileges

## Quick Setup

### 1. Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE socx_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit
EXIT;
```

### 2. Create Tables

```bash
# Run migrations
mysql -u root -p socx_database < backend/src/migrations/create_blacklisted_tokens_table.sql

# Or using MySQL CLI
mysql -u root -p socx_database
```

Then run:
```sql
SOURCE backend/src/migrations/create_blacklisted_tokens_table.sql;
```

### 3. Update users Table

If `users` table already exists, add required security columns:

```sql
-- Check if columns exist
DESCRIBE users;

-- Add isActive column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS isActive TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Account active status';

-- Add passwordChangedAt column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS passwordChangedAt DATETIME NULL 
COMMENT 'Last password change timestamp';

-- Verify changes
DESCRIBE users;
```

### 4. Verify Setup

```sql
-- Check tables
SHOW TABLES;

-- Check blacklisted_tokens table structure
DESCRIBE blacklisted_tokens;

-- Check indexes
SHOW INDEX FROM blacklisted_tokens;

-- Check users table
DESCRIBE users;
```

## Complete Database Schema

### users Table

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  passwordChangedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### blacklisted_tokens Table

```sql
CREATE TABLE blacklisted_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  reason VARCHAR(50) DEFAULT 'logout',
  user_id INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_token (token(255)),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Troubleshooting

### Error: Unknown database 'socx_database'

**Solution:**
```bash
mysql -u root -p -e "CREATE DATABASE socx_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Error: Access denied for user

**Solution:**
Check your `.env` file and update database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=socx_database
DB_PORT=3306
```

### Error: Table 'users' doesn't exist

**Solution:**
Create the users table using the schema provided above or run seed script:
```bash
npm run seed
```

## Environment Variables

Update `.env` file with your database configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=socx_database
DB_PORT=3306
```

## Backup & Restore

### Backup Database

```bash
# Full backup
mysqldump -u root -p socx_database > backup.sql

# Backup specific tables
mysqldump -u root -p socx_database users > users_backup.sql
mysqldump -u root -p socx_database blacklisted_tokens > tokens_backup.sql
```

### Restore Database

```bash
# Restore from backup
mysql -u root -p socx_database < backup.sql

# Restore specific table
mysql -u root -p socx_database < users_backup.sql
```

## Maintenance

### Daily Tasks
- Monitor database connection errors
- Check disk space usage
- Review slow query logs

### Weekly Tasks
- Review blacklisted_tokens table size
- Clean up old expired tokens (automated by server)
- Check for orphaned records

### Monthly Tasks
- Run database optimization
- Update statistics
- Review and update indexes if needed

## Performance Optimization

### Enable Query Cache

```sql
SET GLOBAL query_cache_size = 67108864;
SET GLOBAL query_cache_type = ON;
```

### Optimize Tables

```sql
OPTIMIZE TABLE users;
OPTIMIZE TABLE blacklisted_tokens;
```

### Analyze Tables

```sql
ANALYZE TABLE users;
ANALYZE TABLE blacklisted_tokens;
```

## Security Recommendations

1. **Create Dedicated Database User**

```sql
-- Create user
CREATE USER 'socx_user'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON socx_database.* TO 'socx_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;
```

2. **Use Strong Passwords**
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Use password manager

3. **Restrict Remote Access**
```sql
-- Only allow localhost access
CREATE USER 'socx_user'@'localhost' IDENTIFIED BY 'password';

-- If remote access needed, use VPN or whitelist IP
CREATE USER 'socx_user'@'specific_ip_address' IDENTIFIED BY 'password';
```

4. **Enable SSL/TLS**
```sql
-- Require SSL for connections
ALTER USER 'socx_user'@'localhost' REQUIRE SSL;
```

## Monitoring

### Check Connections

```sql
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

### Check Table Size

```sql
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = 'socx_database'
ORDER BY (data_length + index_length) DESC;
```

### Check Blacklisted Tokens

```sql
-- Count tokens
SELECT COUNT(*) as total_tokens FROM blacklisted_tokens;

-- Count expired tokens
SELECT COUNT(*) as expired_tokens FROM blacklisted_tokens WHERE expires_at < NOW();

-- Count by reason
SELECT reason, COUNT(*) as count FROM blacklisted_tokens GROUP BY reason;

-- Cleanup expired tokens (automated by server, but can be manual too)
DELETE FROM blacklisted_tokens WHERE expires_at < NOW();
```

## Support

For database-related issues:
- Documentation: See `SECURITY.md` and `SECURITY_SETUP.md`
- Email: support@socx.com

---

**Last Updated**: 2026-01-28