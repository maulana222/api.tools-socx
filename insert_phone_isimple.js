const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importPhones() {
  try {
    // 1. Baca file .txt
    const fileContent = fs.readFileSync('nomor_telepon.txt', 'utf-8');
    
    // 2. Split per baris dan bersihkan
    const phoneNumbers = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // hapus baris kosong
    
    console.log(`Total nomor: ${phoneNumbers.length}`);
    
    // 3. Koneksi database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    
    // 4. Prepare data untuk bulk insert
    const values = phoneNumbers.map(phone => [
      phone,
      new Date(),
      new Date()
    ]);
    
    // 5. Bulk insert dengan batch (500 per batch). Jika batch gagal (ada duplikat), insert satu per satu pakai INSERT IGNORE.
    const batchSize = 500;
    let inserted = 0;
    let duplicates = 0;

    const insertBatchOneByOne = async (batch) => {
      let batchInserted = 0;
      let batchDup = 0;
      for (const row of batch) {
        const [result] = await connection.query(
          'INSERT IGNORE INTO isimple_phones (phone_number, created_at, updated_at) VALUES (?, ?, ?)',
          [row[0], row[1], row[2]]
        );
        if (result.affectedRows === 1) batchInserted++;
        else batchDup++;
      }
      return { batchInserted, batchDup };
    };
    
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      
      try {
        const [result] = await connection.query(
          'INSERT INTO isimple_phones (phone_number, created_at, updated_at) VALUES ?',
          [batch]
        );
        inserted += result.affectedRows;
        console.log(`Progress: ${inserted + duplicates}/${values.length}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          const { batchInserted, batchDup } = await insertBatchOneByOne(batch);
          inserted += batchInserted;
          duplicates += batchDup;
          console.log(`Progress: ${inserted + duplicates}/${values.length} (+${batchInserted} masuk, ${batchDup} duplikat di batch ini)`);
        } else {
          throw error;
        }
      }
    }
    
    await connection.end();
    
    console.log(`\nSelesai! Total diimpor: ${inserted} nomor`);
    console.log(`Total duplikat yang diabaikan: ${duplicates} nomor`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

(async () => {
  await importPhones();
})();