const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const database = require('../config/database');

async function runMigration() {
  try {
    console.log('Running migration: create_socx_tokens_table.sql');
    
    await database.connect();
    
    const tables = await database.query("SHOW TABLES LIKE 'socx_tokens'");
    
    if (tables.length > 0) {
      console.log('⚠️  Table socx_tokens already exists, skipping migration');
      process.exit(0);
    }
    
    const migrationPath = path.join(__dirname, '../migrations/create_socx_tokens_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await database.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Created table: socx_tokens');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();