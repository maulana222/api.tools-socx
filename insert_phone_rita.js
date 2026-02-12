/**
 * Import nomor telepon dari file .txt ke tabel rita_phones
 * Usage: node insert_phone_rita.js [file.txt]
 *        Default file: nomor_telepon.txt (atau nomor_rita.txt jika ada)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DEFAULT_FILES = ['nomor_rita.txt', 'nomor_telepon.txt'];

async function importPhones() {
  try {
    // 1. Tentukan file sumber (argumen atau default)
    const fileArg = process.argv[2];
    let filePath;
    if (fileArg) {
      filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
    } else {
      const cwd = process.cwd();
      filePath = path.join(cwd, 'nomor_rita.txt');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(cwd, 'nomor_telepon.txt');
      }
    }

    if (!fs.existsSync(filePath)) {
      console.error('File tidak ditemukan:', filePath);
      console.log('Usage: node insert_phone_rita.js [file.txt]');
      console.log('Contoh: node insert_phone_rita.js nomor_rita.txt');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const phoneNumbers = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\s+/g, ''))
      .filter((line) => line.length > 0);

    console.log('Tabel: rita_phones');
    console.log('File:', filePath);
    console.log('Total nomor:', phoneNumbers.length);
    if (phoneNumbers.length === 0) {
      console.log('Tidak ada nomor untuk diimpor.');
      process.exit(0);
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    const now = new Date();
    const values = phoneNumbers.map((phone) => [phone, now, now]);

    const batchSize = 500;
    let inserted = 0;
    let duplicates = 0;

    const insertBatchOneByOne = async (batch) => {
      let batchInserted = 0;
      let batchDup = 0;
      for (const row of batch) {
        const [result] = await connection.query(
          'INSERT IGNORE INTO rita_phones (phone_number, created_at, updated_at) VALUES (?, ?, ?)',
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
          'INSERT INTO rita_phones (phone_number, created_at, updated_at) VALUES ?',
          [batch]
        );
        inserted += result.affectedRows;
        console.log('Progress:', inserted + duplicates + '/' + values.length);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          const { batchInserted, batchDup } = await insertBatchOneByOne(batch);
          inserted += batchInserted;
          duplicates += batchDup;
          console.log(
            'Progress:',
            inserted + duplicates + '/' + values.length,
            '(+' + batchInserted + ' masuk, ' + batchDup + ' duplikat di batch ini)'
          );
        } else {
          throw error;
        }
      }
    }

    await connection.end();

    console.log('\nSelesai! Total diimpor ke rita_phones:', inserted, 'nomor');
    console.log('Total duplikat yang diabaikan:', duplicates, 'nomor');
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

(async () => {
  await importPhones();
})();
