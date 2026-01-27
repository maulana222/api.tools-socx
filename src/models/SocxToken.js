const database = require('../config/database');
const jwt = require('jsonwebtoken');

class SocxToken {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.apiToken = data.api_token;
    this.isActive = data.is_active;
    this.expiresAt = data.expires_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async save(userId, apiToken) {
    const sql = `
      INSERT INTO socx_tokens (user_id, api_token, is_active, expires_at)
      VALUES (?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        api_token = VALUES(api_token),
        is_active = 1,
        expires_at = VALUES(expires_at),
        updated_at = NOW()
    `;

    // Decode token untuk mendapatkan expiry
    let expiresAt = null;
    try {
      const decoded = jwt.decode(apiToken);
      if (decoded && decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      }
    } catch (error) {
      console.error('Error decoding token:', error.message);
    }

    await database.query(sql, [userId, apiToken, expiresAt]);
    return { success: true, expiresAt };
  }

  static async getActive(userId) {
    const sql = `
      SELECT id, user_id, api_token, is_active, expires_at, created_at, updated_at
      FROM socx_tokens
      WHERE user_id = ? AND is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const results = await database.query(sql, [userId]);
    return results.length > 0 ? new SocxToken(results[0]) : null;
  }

  static async deactivate(userId) {
    const sql = `
      UPDATE socx_tokens
      SET is_active = 0, updated_at = NOW()
      WHERE user_id = ?
    `;

    await database.query(sql, [userId]);
    return { success: true };
  }

  static async delete(userId) {
    const sql = 'DELETE FROM socx_tokens WHERE user_id = ?';
    await database.query(sql, [userId]);
    return { success: true };
  }

  static async getAll(userId) {
    const sql = `
      SELECT id, user_id, is_active, expires_at, created_at, updated_at
      FROM socx_tokens
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `;

    const results = await database.query(sql, [userId]);
    return results.map(result => new SocxToken(result));
  }

  isValid() {
    if (!this.isActive) return false;
    if (!this.expiresAt) return true; // Tidak ada expiry, anggap valid
    return new Date(this.expiresAt) > new Date();
  }

  isExpiringSoon(minutes = 30) {
    if (!this.expiresAt) return false;
    const timeUntilExpiry = new Date(this.expiresAt) - new Date();
    return timeUntilExpiry < minutes * 60 * 1000;
  }
}

module.exports = SocxToken;