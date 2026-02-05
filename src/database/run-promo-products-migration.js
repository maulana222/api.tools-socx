const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const runMigration = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'socx_database',
      charset: 'utf8mb4',
      multipleStatements: true // Allow multiple statements
    });

    console.log('✓ Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../../migrations/create_promo_products_table.sql'),
      'utf8'
    );

    await connection.query(migrationSQL);
    console.log('✓ Migration executed successfully: promo_products table created');

    await connection.end();
    console.log('✓ Database connection closed');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
};

runMigration();