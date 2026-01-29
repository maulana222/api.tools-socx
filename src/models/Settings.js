const database = require('../config/database');

class Settings {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.key = data.setting_key;
    this.value = data.setting_value;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async getByKey(userId, key) {
    const sql = `
      SELECT id, user_id, setting_key, setting_value, created_at, updated_at
      FROM settings
      WHERE user_id = ? AND setting_key = ?
      LIMIT 1
    `;

    const results = await database.query(sql, [userId, key]);
    return results.length > 0 ? new Settings(results[0]) : null;
  }

  static async set(userId, key, value) {
    const existing = await Settings.getByKey(userId, key);

    if (existing) {
      // Update existing setting
      const updateSql = `
        UPDATE settings
        SET setting_value = ?, updated_at = NOW()
        WHERE user_id = ? AND setting_key = ?
      `;
      await database.query(updateSql, [value, userId, key]);
    } else {
      // Insert new setting
      const insertSql = `
        INSERT INTO settings (user_id, setting_key, setting_value, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      await database.query(insertSql, [userId, key, value]);
    }

    return { success: true };
  }

  static async delete(userId, key) {
    const sql = 'DELETE FROM settings WHERE user_id = ? AND setting_key = ?';
    await database.query(sql, [userId, key]);
    return { success: true };
  }

  static async getAll(userId) {
    const sql = `
      SELECT id, user_id, setting_key, setting_value, created_at, updated_at
      FROM settings
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `;

    const results = await database.query(sql, [userId]);
    return results.map(result => new Settings(result));
  }
}

module.exports = Settings;