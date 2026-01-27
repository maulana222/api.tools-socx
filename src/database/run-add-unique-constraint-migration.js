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

    console.log('Removing any duplicate user_id entries (keeping the most recent one)...');
    await connection.query(`
      DELETE t1 FROM socx_tokens t1
      INNER JOIN socx_tokens t2
      WHERE t1.user_id = t2.user_id
      AND t1.id < t2.id
    `);

    console.log('Adding unique constraint on user_id...');
    await connection.query('ALTER TABLE socx_tokens ADD UNIQUE INDEX idx_user_id_unique (user_id)');
    
    await connection.end();
    console.log('✅ Successfully added unique constraint on user_id');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding unique constraint:', error.message);
    process.exit(1);
  }
}

runMigration();