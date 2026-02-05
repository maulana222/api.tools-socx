const db = require('../src/config/database');

(async () => {
  try {
    await db.connect();
    const rows = await db.query('SELECT * FROM projects WHERE code = ? OR name = ?', ['isimple', 'Isimple']);
    const list = Array.isArray(rows) ? rows : [];
    if (list.length > 0) {
      await db.query(
        'UPDATE projects SET code = ?, description = ?, status = ? WHERE id = ?',
        ['isimple', 'Pengecekan paket data Isimple', 'active', list[0].id]
      );
      console.log('Project isimple diperbarui.');
    } else {
      await db.query(
        'INSERT INTO projects (name, code, description, status) VALUES (?, ?, ?, ?)',
        ['Isimple', 'isimple', 'Pengecekan paket data Isimple', 'active']
      );
      console.log('Project isimple dibuat.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (db.close) await db.close();
  }
})();
