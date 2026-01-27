# Security Guide - Socx Backend

## Overview

This document outlines the security features implemented in the Socx backend application and provides guidelines for maintaining and enhancing security.

## Security Features Implemented

### 1. Authentication & Authorization

#### JWT Token System
- **Access Tokens**: 7-day expiration
- **Refresh Tokens**: 30-day expiration
- **Token Blacklisting**: Revoked tokens are stored and checked on every request
- **Token Rotation**: New tokens issued on refresh for enhanced security

#### Password Security
- **Minimum Length**: 12 characters
- **Maximum Length**: 128 characters
- **Complexity Requirements**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)
- **Hashing**: bcrypt with 12 rounds
- **Password History**: Cannot reuse current password

#### Account Security
- **Account Deactivation**: Supports `isActive` field for account suspension
- **Password Change Tracking**: `passwordChangedAt` timestamp
- **Token Invalidation on Password Change**: All tokens invalidated after password change

### 2. Rate Limiting

#### Multiple Rate Limiting Tiers

**Authentication Endpoints** (`/api/auth`)
- **Limit**: 5 requests per 15 minutes per IP
- **Purpose**: Prevent brute force attacks on login/register
- **Configuration**: `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX_REQUESTS`

**API Endpoints** (`/api`)
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Prevent API abuse and DoS attacks
- **Configuration**: `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`

**Password Reset**
- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevent password reset abuse
- **Configuration**: `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`, `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS`

#### Trusted IPs
- Trusted IPs bypass rate limiting
- **Configuration**: `TRUSTED_IPS` (comma-separated)

### 3. Request Security

#### Input Sanitization
- Removes dangerous characters (`<`, `>`) from all input
- Recursive sanitization for nested objects
- Applied to both `req.body` and `req.query`

#### Content-Type Validation
- Only accepts `application/json` or `multipart/form-data`
- Prevents content-type injection attacks

#### Parameter Pollution Prevention
- Removes duplicate query parameters
- Prevents parameter pollution attacks

#### Request Size Limiting
- **Default Limit**: 10MB
- **Configuration**: `MAX_REQUEST_SIZE`
- Prevents payload-based DoS attacks

### 4. Security Headers

#### Helmet.js Configuration
- **Content Security Policy (CSP)**:
  - Default source: `'self'`
  - Scripts: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`
  - Styles: `'self'`, `'unsafe-inline'`, Google Fonts
  - Images: `'self'`, `data:`, `https:`, `blob:`
  - Fonts: `'self'`, Google Fonts
  - Frames: `'none'` (clickjacking protection)

- **HSTS (HTTP Strict Transport Security)**:
  - Max age: 31536000 (1 year)
  - Include subdomains: true
  - Preload: false (configurable)

- **XSS Protection**: Enabled
- **No Sniff**: Enabled (MIME type sniffing prevention)
- **Frameguard**: `deny` (clickjacking protection)
- **Referrer Policy**: `strict-origin-when-cross-origin`

### 5. CORS Configuration

#### Whitelist-based CORS
- **Development**: `http://localhost:9899`, `http://localhost:3000`
- **Production**: Configure via `CORS_ORIGIN` (comma-separated)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization
- **Credentials**: Enabled
- **Max Age**: 24 hours

### 6. IP Security

#### IP Blocking
- Blocked IPs receive 403 Forbidden
- **Configuration**: `BLOCKED_IPS` (comma-separated)

#### IP Validation
- Validates IP on every request
- Supports proxy/trusted proxy configuration

### 7. Audit Logging

#### Comprehensive Logging
- **Request Logging**:
  - Method and path
  - IP address
  - User-Agent
  - User ID (authenticated requests)
  - Timestamp

- **Response Logging**:
  - Status code
  - Response time
  - User ID
  - Timestamp

#### Sensitive Data Masking
- Automatically masks sensitive fields in logs:
  - `password`
  - `token`
  - `creditCard`
  - `cvv`
  - `ssn`

**Configuration**: `LOG_SENSITIVE_DATA` (default: false)

### 8. Token Blacklisting

#### Features
- **Logout**: Tokens blacklisted on logout
- **Password Change**: All tokens invalidated after password change
- **Expiration**: Tokens removed after expiry
- **Automatic Cleanup**: Expired tokens cleaned every hour

#### Database Schema
```sql
CREATE TABLE blacklisted_tokens (
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
);
```

### 9. Scheduled Tasks

#### Automatic Cleanup
- **Blacklisted Tokens**: Cleaned every hour
- **Interval**: 60 minutes (configurable via `BLACKLIST_CLEANUP_INTERVAL`)

## Setup Instructions

### 1. Initial Setup

#### Create Blacklisted Tokens Table
```bash
# Run migration
mysql -u root -p socx_database < backend/src/migrations/create_blacklisted_tokens_table.sql
```

#### Update User Model
Ensure `User` model has:
- `isActive` field (boolean, default: true)
- `passwordChangedAt` field (datetime, nullable)

### 2. Environment Configuration

Copy `.env.example` to `.env` and update:

```bash
cp backend/.env.example backend/.env
```

#### Required Security Settings
```env
# JWT Secrets (GENERATE NEW FOR PRODUCTION)
JWT_SECRET=<generate-using-node-e-crypto>
JWT_REFRESH_SECRET=<generate-using-node-e-crypto>

# CORS Origins (comma-separated for multiple)
CORS_ORIGIN=http://localhost:9899,http://localhost:3000

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Password Requirements
PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_LENGTH=128
```

#### Generate Secure Secrets
```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Production Deployment Checklist

- [ ] Change all default secrets
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to production URL
- [ ] Enable `ENABLE_HSTS_PRELOAD=true`
- [ ] Set `LOG_SENSITIVE_DATA=false`
- [ ] Configure trusted IPs if needed
- [ ] Set up SSL/TLS certificates
- [ ] Configure database firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and alerts
- [ ] Review and update password policies
- [ ] Run security audit

## Best Practices

### 1. Password Management

#### For Developers
- Never commit `.env` files
- Use environment-specific secrets
- Rotate secrets regularly (every 90 days)
- Use password managers for storing secrets

#### For Users
- Enforce password complexity requirements
- Implement password expiration policies
- Encourage password managers
- Provide clear password requirements during registration

### 2. Token Management

#### Access Tokens
- Short expiration (7 days recommended)
- Include minimal user data in payload
- Validate on every request

#### Refresh Tokens
- Longer expiration (30 days)
- Rotate on every refresh
- Revoke on password change
- Revoke on logout

### 3. API Security

#### Input Validation
- Validate all inputs on server-side
- Never trust client-side validation
- Use parameterized queries
- Sanitize all user input

#### Error Handling
- Don't leak sensitive information
- Use generic error messages in production
- Log detailed errors server-side
- Implement proper HTTP status codes

### 4. Monitoring & Logging

#### What to Monitor
- Failed login attempts
- Rate limit violations
- Unusual API usage patterns
- Token blacklisting events
- Database errors

#### Alert Thresholds
- More than 10 failed logins per minute
- More than 100 rate limit violations per hour
- Database connection errors
- Server CPU > 80% for > 5 minutes

### 5. Regular Security Tasks

#### Daily
- Review error logs
- Monitor rate limit violations
- Check for blocked IPs

#### Weekly
- Review audit logs
- Analyze security events
- Update blocked IPs if needed

#### Monthly
- Rotate secrets
- Review and update dependencies
- Run security scans
- Review user access

#### Quarterly
- Security audit
- Penetration testing
- Update security policies
- Review and update documentation

## Common Security Issues and Solutions

### 1. Brute Force Attacks

**Detection**: High rate of failed login attempts

**Mitigation**:
- Rate limiting is enabled by default
- Consider implementing CAPTCHA
- Monitor for patterns
- Block suspicious IPs

### 2. Token Theft

**Prevention**:
- Use HTTPS in production
- Store tokens securely (HttpOnly cookies recommended)
- Implement token rotation
- Blacklist tokens on logout

### 3. SQL Injection

**Prevention**:
- Use parameterized queries (already implemented)
- Validate and sanitize all inputs
- Use ORM or query builders
- Regular security audits

### 4. XSS Attacks

**Prevention**:
- Content Security Policy (CSP)
- Input sanitization (already implemented)
- Output encoding
- HttpOnly cookies for sensitive data

### 5. CSRF Attacks

**Prevention**:
- SameSite cookie attributes
- CSRF tokens for state-changing requests
- Validate Origin and Referer headers
- Use anti-CSRF tokens

## Security Testing

### 1. Automated Testing

Run security tests:
```bash
# Run auth tests
npm test

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 2. Manual Testing

#### Test Rate Limiting
```bash
# Test auth endpoint rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done
```

#### Test Input Validation
```bash
# Test XSS attempts
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","email":"test@test.com","password":"Test123!@#","firstName":"Test","lastName":"User"}'
```

#### Test Token Blacklisting
```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!@#"}' \
  | jq -r '.data.tokens.accessToken')

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Try to use blacklisted token
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Security Tools

Recommended tools:
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Web application security testing
- **SQLMap**: SQL injection testing
- **Nikto**: Web server scanner
- **Nmap**: Network scanner

## Troubleshooting

### Rate Limiting Issues

**Problem**: Legitimate users being rate limited

**Solution**:
1. Check `TRUSTED_IPS` configuration
2. Increase rate limits if needed
3. Implement CAPTCHA for high-traffic endpoints
4. Use sliding window rate limiting

### Token Issues

**Problem**: Users frequently logged out

**Solution**:
1. Check JWT expiration times
2. Verify token blacklisting is working correctly
3. Check for concurrent logins
4. Review clock synchronization

### Database Performance

**Problem**: Slow queries due to token blacklisting

**Solution**:
1. Ensure indexes are created on `blacklisted_tokens`
2. Optimize cleanup interval
3. Consider using Redis for token blacklist
4. Monitor database performance

## Additional Resources

### Security Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Tools
- [Snyk](https://snyk.io/): Dependency vulnerability scanning
- [Dependabot](https://dependabot.com/): Automated dependency updates
- [SonarQube](https://www.sonarqube.org/): Code quality and security analysis

### Learning
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

## Contact

For security-related questions or concerns:
- Email: security@socx.com
- Security: Report vulnerabilities through responsible disclosure

---

**Last Updated**: 2026-01-28
**Version**: 2.0.0