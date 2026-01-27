const path = require('path');
const fs = require('fs');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const database = require('../config/database');

async function runMigration() {
  try {
    console.log('Running migration: create_blacklisted_tokens_table.sql');
    
    // Connect to database
    await database.connect();
    
    // Check if table already exists
    const tables = await database.query("SHOW TABLES LIKE 'blacklisted_tokens'");
    
    if (tables.length > 0) {
      console.log('⚠️  Table blacklisted_tokens already exists, skipping migration');
      process.exit(0);
    }
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/create_blacklisted_tokens_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await database.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Created table: blacklisted_tokens');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();