/**
 * Recreate isimple_products table dan isi data Indosat Freedom Internet
 * Menjalankan: backend/migrations/recreate_and_seed_isimple_products.sql
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('📦 Recreate isimple_products + seed data Indosat...');
    const sqlPath = path.join(__dirname, '../../migrations/recreate_and_seed_isimple_products.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);
    const [rows] = await connection.query('SELECT COUNT(*) as total FROM isimple_products');
    console.log('✅ Selesai. Total baris di isimple_products:', rows[0].total);
  } catch (error) {
    console.error('❌ Gagal:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
