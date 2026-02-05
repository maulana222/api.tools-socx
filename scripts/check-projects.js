const db = require('../src/config/database');

(async () => {
  try {
    await db.connect();
    const rows = await db.query('SELECT * FROM projects ORDER BY id');
    const list = Array.isArray(rows) ? rows : [];
    console.log('All projects:', list.length);
    console.log(JSON.stringify(list, null, 2));
    const isimple = list.filter((p) => p.code === 'isimple' || (p.name && p.name.toLowerCase().includes('isimple')));
    console.log('\nIsimple-related:', isimple.length);
    console.log(JSON.stringify(isimple, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (db.close) await db.close();
  }
})();
