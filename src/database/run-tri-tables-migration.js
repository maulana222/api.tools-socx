/**
 * Jalankan migration tabel Tri: tri_numbers, tri_promo_products
 * Run: node src/database/run-tri-tables-migration.js
 * (dari folder backend)
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const runMigration = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'socx_database',
      charset: 'utf8mb4'
    });

    console.log('✓ Connected to database');

    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = [
      'create_tri_numbers_table.sql',
      'create_tri_promo_products_table.sql'
    ];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn('⚠ Skip (file not found):', file);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      await connection.query(sql);
      console.log('✓ Executed:', file);
    }

    await connection.end();
    console.log('✓ Database connection closed');
    console.log('\n✅ Migration Tri tables completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (connection) await connection.end().catch(() => {});
    process.exit(1);
  }
};

runMigration();
