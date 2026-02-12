/**
 * Tambah project Tri Rita (code = 'tri') ke tabel projects jika belum ada.
 * Jalankan: node backend/scripts/add-tri-project.js
 */
const db = require('../src/config/database');

async function addTriProject() {
  try {
    await db.connect();
    const existing = await db.query('SELECT * FROM projects WHERE code = ?', ['tri']);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log('Project tri sudah ada.');
      process.exit(0);
    }
    await db.query(
      'INSERT INTO projects (name, code, description, status) VALUES (?, ?, ?, ?)',
      ['Tri Rita', 'tri', 'Pengecekan paket data Tri Rita', 'active']
    );
    console.log('Project Tri Rita (code: tri) berhasil ditambahkan.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (db.close) await db.close();
  }
}

addTriProject();
