/**
 * Jalankan migration tabel rita_phones
 * Run: node src/database/run-rita-phones-migration.js
 * (dari folder backend)
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function run() {
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

    const sqlPath = path.join(__dirname, '../../migrations/create_rita_phones_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);
    console.log('✓ Executed: create_rita_phones_table.sql');

    await connection.end();
    console.log('✓ Database connection closed');
    console.log('\n✅ Tabel rita_phones berhasil dibuat.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (connection) await connection.end().catch(() => {});
    process.exit(1);
  }
}

run();
