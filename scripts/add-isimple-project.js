const db = require('../src/config/database');

async function addIsimpleProject() {
  try {
    await db.connect();
    const existing = await db.query('SELECT * FROM projects WHERE code = ?', ['isimple']);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log('Project isimple sudah ada.');
      process.exit(0);
    }
    await db.query(
      'INSERT INTO projects (name, code, description, status) VALUES (?, ?, ?, ?)',
      ['Isimple', 'isimple', 'Pengecekan paket data Isimple', 'active']
    );
    console.log('Project isimple berhasil ditambahkan.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (db.close) await db.close();
  }
}

addIsimpleProject();
