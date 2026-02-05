const db = require('../src/config/database');

(async () => {
  try {
    await db.connect();
    const rows = await db.query('SELECT * FROM projects ORDER BY id');
    const list = Array.isArray(rows) ? rows : [];
    console.log('Projects:', list.length);
    list.forEach((p) => console.log(`  ${p.id} | ${p.name} | ${p.code}`));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (db.close) await db.close();
  }
})();
