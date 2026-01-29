const database = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runSettingsMigration() {
  try {
    console.log('Connecting to database...');
    await database.connect();
    
    console.log('Running settings migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/create_settings_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await database.query(sql);
    
    console.log('✓ Settings table created successfully');
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✓ Settings table already exists');
      process.exit(0);
    } else {
  }
}

runSettingsMigration();