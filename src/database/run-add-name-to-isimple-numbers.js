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
    multipleStatements: true
  });
  try {
    const sqlPath = path.join(__dirname, '../../migrations/add_name_to_isimple_numbers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);
    console.log('✅ Kolom name dan last_checked_at ditambahkan ke isimple_numbers');
  } catch (error) {
    if (error.message && error.message.includes('Duplicate column')) {
      console.log('⚠️ Kolom sudah ada, skip.');
    } else {
      console.error('❌ Gagal:', error.message);
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

run();
