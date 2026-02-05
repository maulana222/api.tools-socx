const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const runMigration = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'socx_database',
      charset: 'utf8mb4'
    });

    console.log('✓ Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../../migrations/create_isimple_numbers_table.sql'),
      'utf8'
    );

    await connection.query(migrationSQL);
    console.log('✓ Migration executed successfully: isimple_numbers table created');

    await connection.end();
    console.log('✓ Database connection closed');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();