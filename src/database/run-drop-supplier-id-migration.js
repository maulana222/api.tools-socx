const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'socx_otomatic'
    });

    console.log('Dropping supplier_id column from socx_tokens table...');
    await connection.query('ALTER TABLE socx_tokens DROP COLUMN supplier_id');
    
    await connection.end();
    console.log('✅ Successfully dropped supplier_id column from socx_tokens table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping supplier_id column:', error.message);
    process.exit(1);
  }
}

runMigration();