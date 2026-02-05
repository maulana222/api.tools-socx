const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });
    
    try {
        console.log('🗑️ Starting drop columns from Isimple Phones table migration...');
        
        // Read and execute SQL migration file
        const migrationPath = path.join(__dirname, '../../migrations/drop_columns_from_isimple_phones.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        await connection.execute(sql);
        console.log('✅ Columns dropped from Isimple Phones table successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration().catch(console.error);