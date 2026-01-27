# Security Implementation Setup Guide

This guide will help you set up and configure the security features implemented in the Socx backend application.

## Prerequisites

- Node.js v16 or higher
- MySQL v8.0 or higher
- Access to database
- Administrator privileges for running migrations

## Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Generate new JWT secrets for production!
```

### Step 3: Run Database Migration

```bash
# Create blacklisted_tokens table
mysql -u root -p socx_database < src/migrations/create_blacklisted_tokens_table.sql
```

### Step 4: Update User Model

Ensure your `users` table has the following columns:

```sql
ALTER TABLE users 
ADD COLUMN isActive TINYINT(1) DEFAULT 1,
ADD COLUMN passwordChangedAt DATETIME NULL;
```

### Step 5: Start the Server

```bash
npm run dev
```

That's it! Your application is now secured with all the security features.

## Detailed Setup

### 1. Database Setup

#### Create the blacklisted_tokens table

```bash
# Method 1: Direct SQL
mysql -u root -p socx_database < src/migrations/create_blacklisted_tokens_table.sql

# Method 2: MySQL CLI
mysql -u root -p socx_database
```

Then run:
```sql
SOURCE src/migrations/create_blacklisted_tokens_table.sql;
EXIT;
```

#### Update users table

```sql
-- Check if columns exist
DESCRIBE users;

-- Add isActive column if not exists
ALTER TABLE users 
ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Account active status';

-- Add passwordChangedAt column if not exists
ALTER TABLE users 
ADD COLUMN passwordChangedAt DATETIME NULL COMMENT 'Last password change timestamp';

-- Verify changes
DESCRIBE users;
```

### 2. Environment Configuration

#### Generate Secure JWT Secrets

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret  
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Update .env File

Copy `.env.example` to `.env` and update the following:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=socx_database
DB_PORT=3306

# JWT Configuration (USE GENERATED SECRETS!)
JWT_SECRET=your_generated_secret_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_REFRESH_EXPIRE=30d

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100
PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000
PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=3

# CORS Configuration
CORS_ORIGIN=http://localhost:9899,http://localhost:3000

# IP Configuration
TRUSTED_IPS=
BLOCKED_IPS=

# Request Size Limit
MAX_REQUEST_SIZE=10485760

# Security Headers
ENABLE_HSTS_PRELOAD=false

# Token Blacklist
BLACKLIST_CLEANUP_INTERVAL=3600000

# Password Requirements
PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_SPECIAL_CHAR=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true

# Session Management
ENABLE_TOKEN_ROTATION=true

# Security Logging
LOG_AUTH_ATTEMPTS=true
LOG_API_REQUESTS=true
LOG_SENSITIVE_DATA=false
```

### 3. Verify Installation

#### Test Database Connection

```bash
# Start the server
npm run dev

# You should see:
# ✅ Database connected successfully
# 🚀 Server running on port 3000
# Scheduled tasks started
```

#### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-28T03:00:00.000Z",
  "environment": "development",
  "uptime": 1.234
}
```

#### Test Authentication with Security Features

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response (with enhanced password validation):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "user",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

### 4. Test Security Features

#### Test Rate Limiting

```bash
# Try to login multiple times (should fail after 5 attempts)
for i in {1..7}; do
  echo "Attempt $i"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}'
  echo ""
done
```

After 5 attempts, you should get:
```json
{
  "success": false,
  "message": "Too many login attempts, please try again after 15 minutes.",
  "retryAfter": 900
}
```

#### Test Token Blacklisting

```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPassword123!@#"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Access protected route
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Logout (blacklist token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"token_here"}'

# Try to use blacklisted token (should fail)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

Expected error:
```json
{
  "success": false,
  "message": "Token has been revoked"
}
```

#### Test Input Sanitization

```bash
# Try XSS attack
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "<script>alert(1)</script>",
    "email": "test@example.com",
    "password": "TestPassword123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

The `<script>` tags will be removed before processing.

#### Test Password Requirements

```bash
# Try weak password (should fail)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "weakuser",
    "email": "weak@example.com",
    "password": "weak123",
    "firstName": "Weak",
    "lastName": "User"
  }'
```

Expected error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Password must be between 12 and 128 characters long",
      "param": "password",
      "location": "body"
    },
    {
      "msg": "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "param": "password",
      "location": "body"
    }
  ]
}
```

## Production Setup

### 1. Generate Production Secrets

```bash
# Generate strong secrets for production
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
```

### 2. Update Production .env

```env
NODE_ENV=production
PORT=3000

# Use production database credentials
DB_HOST=your-production-db-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-db-password
DB_NAME=socx_production
DB_PORT=3306

# Use generated secrets
JWT_SECRET=your_production_secret_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_production_refresh_secret_here
JWT_REFRESH_EXPIRE=30d

# Increase BCRYPT rounds for production
BCRYPT_ROUNDS=14

# Rate limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# CORS - Update with production URL
CORS_ORIGIN=https://your-domain.com

# Security logging
LOG_AUTH_ATTEMPTS=true
LOG_API_REQUESTS=true
LOG_SENSITIVE_DATA=false

# Enable HSTS preload
ENABLE_HSTS_PRELOAD=true
```

### 3. Security Checklist

Before going to production:

- [ ] Changed all default secrets
- [ ] Set `NODE_ENV=production`
- [ ] Updated `CORS_ORIGIN` to production URL
- [ ] Enabled `ENABLE_HSTS_PRELOAD=true`
- [ ] Set `LOG_SENSITIVE_DATA=false`
- [ ] Configured HTTPS/SSL
- [ ] Set up database backups
- [ ] Configured firewall rules
- [ ] Set up monitoring and alerts
- [ ] Reviewed password policies
- [ ] Tested all security features
- [ ] Run security audit
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configured log aggregation
- [ ] Set up CDN for static assets
- [ ] Implemented rate limiting at edge/network level

### 4. Run Security Tests

```bash
# Check for vulnerabilities
npm audit

# Run test suite
npm test

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done

# Test input validation
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","email":"test@test.com","password":"weak","firstName":"Test","lastName":"User"}'
```

## Troubleshooting

### Issue: Database connection failed

**Solution:**
```bash
# Check MySQL is running
# Windows: services.msc
# Linux/Mac: sudo systemctl status mysql

# Test database connection
mysql -u root -p -e "SELECT 1"

# Check .env database credentials
cat .env | grep DB_
```

### Issue: Rate limiting too aggressive

**Solution:**
```env
# Increase limits in .env
AUTH_RATE_LIMIT_MAX_REQUESTS=10
API_RATE_LIMIT_MAX_REQUESTS=200
```

### Issue: Tokens not being blacklisted

**Solution:**
```sql
-- Check if table exists
SHOW TABLES LIKE 'blacklisted_tokens';

-- Check table structure
DESCRIBE blacklisted_tokens;

-- Verify indexes
SHOW INDEX FROM blacklisted_tokens;
```

### Issue: Password validation too strict

**Solution:**
```env
# Relax requirements in .env
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL_CHAR=false
```

## Maintenance

### Daily Tasks
- Review error logs for security issues
- Monitor rate limit violations
- Check for suspicious activity

### Weekly Tasks
- Review audit logs
- Update blocked IPs if needed
- Check for security updates

### Monthly Tasks
- Rotate JWT secrets
- Review and update dependencies
- Run security scans
- Test security features

### Quarterly Tasks
- Full security audit
- Penetration testing
- Update security policies
- Review documentation

## Support

For issues or questions:
- Documentation: See `SECURITY.md`
- Email: support@socx.com
- GitHub Issues: Report bugs and feature requests

---

**Last Updated**: 2026-01-28