const db = require('../config/database');

class Project {
  static async getAll() {
    const rows = await db.query('SELECT * FROM projects WHERE status = "active" ORDER BY name ASC');
    return Array.isArray(rows) ? rows : [];
  }

  static async getIsimple() {
    return Project.getByCode('isimple');
  }

  static async getById(id) {
    const rows = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  static async getByCode(code) {
    const rows = await db.query('SELECT * FROM projects WHERE code = ? LIMIT 1', [code]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  /** Semua project dengan code tertentu (code boleh sama, jadi bisa banyak) */
  static async getAllByCode(code) {
    const rows = await db.query('SELECT * FROM projects WHERE code = ? ORDER BY name ASC', [code]);
    return Array.isArray(rows) ? rows : [];
  }

  static async getByName(name) {
    const rows = await db.query('SELECT * FROM projects WHERE name = ? LIMIT 1', [name]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  static async create(name, code, description = '') {
    const result = await db.query(
      'INSERT INTO projects (name, code, description) VALUES (?, ?, ?)',
      [name, code, description]
    );
    const id = (result && result.insertId) || (Array.isArray(result) && result[0] && result[0].insertId);
    return id;
  }

  static async update(id, name, code, description) {
    const result = await db.query(
      'UPDATE projects SET name = ?, code = ?, description = ? WHERE id = ?',
      [name, code, description, id]
    );
    return (result && result.affectedRows > 0) || (Array.isArray(result) && result[0] && result[0].affectedRows > 0);
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM projects WHERE id = ?', [id]);
    return (result && result.affectedRows > 0) || (Array.isArray(result) && result[0] && result[0].affectedRows > 0);
  }
}

module.exports = Project;