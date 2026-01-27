const fs = require('fs');
const path = require('path');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const database = require('../config/database');

async function runMigration() {
  let pool;
  try {
    console.log('Running migration: add_account_security_columns.sql');
    
    // Connect to database
    await database.connect();
    
    // Check if columns already exist
    const columns = await database.query("SHOW COLUMNS FROM users LIKE 'is_locked'");
    
    if (columns.length > 0) {
      console.log('⚠️  Columns already exist, skipping migration');
      process.exit(0);
    }
    
    // Add columns
    const alterSQL = `
      ALTER TABLE users 
      ADD COLUMN is_locked BOOLEAN DEFAULT FALSE COMMENT 'Whether the account is currently locked',
      ADD COLUMN locked_until DATETIME NULL COMMENT 'Timestamp until which the account is locked',
      ADD COLUMN login_attempts INT DEFAULT 0 COMMENT 'Number of failed login attempts',
      ADD COLUMN last_login_attempt DATETIME NULL COMMENT 'Timestamp of last login attempt',
      ADD COLUMN last_login_at DATETIME NULL COMMENT 'Timestamp of successful login',
      ADD COLUMN last_login_ip VARCHAR(45) NULL COMMENT 'IP address of last successful login'
    `;
    
    await database.query(alterSQL);
    console.log('✅ Columns added successfully');
    
    // Create indexes
    try {
      await database.query('CREATE INDEX idx_users_is_locked ON users(is_locked)');
      console.log('✅ Index idx_users_is_locked created');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') console.log('⚠️  Could not create idx_users_is_locked:', e.message);
    }
    
    try {
      await database.query('CREATE INDEX idx_users_locked_until ON users(locked_until)');
      console.log('✅ Index idx_users_locked_until created');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') console.log('⚠️  Could not create idx_users_locked_until:', e.message);
    }
    
    try {
      await database.query('CREATE INDEX idx_users_login_attempts ON users(login_attempts)');
      console.log('✅ Index idx_users_login_attempts created');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') console.log('⚠️  Could not create idx_users_login_attempts:', e.message);
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();