const db = require('../config/database');

class TriNumber {
  static async getAll(projectId = null) {
    if (projectId) {
      const rows = await db.query('SELECT * FROM tri_numbers WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
      return Array.isArray(rows) ? rows : [];
    }
    const rows = await db.query('SELECT * FROM tri_numbers ORDER BY created_at DESC');
    return Array.isArray(rows) ? rows : [];
  }

  static async getById(id) {
    const rows = await db.query('SELECT * FROM tri_numbers WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  static async getByProject(projectId) {
    const rows = await db.query('SELECT * FROM tri_numbers WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
    return Array.isArray(rows) ? rows : [];
  }

  static async getOrCreate(projectId, number, name = null) {
    const rows = await db.query('SELECT * FROM tri_numbers WHERE project_id = ? AND number = ? LIMIT 1', [projectId, number]);
    if (Array.isArray(rows) && rows.length > 0) return rows[0];
    try {
      const id = await this.create(number, projectId, name);
      const created = await db.query('SELECT * FROM tri_numbers WHERE id = ?', [id]);
      return Array.isArray(created) && created.length ? created[0] : { id, project_id: projectId, number, name, status: 'pending' };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        const existing = await db.query('SELECT * FROM tri_numbers WHERE project_id = ? AND number = ? LIMIT 1', [projectId, number]);
        if (Array.isArray(existing) && existing.length > 0) return existing[0];
      }
      throw err;
    }
  }

  static async create(number, projectId, name = null) {
    const result = await db.query(
      'INSERT INTO tri_numbers (project_id, number, name, status) VALUES (?, ?, ?, ?)',
      [projectId, number, name || null, 'pending']
    );
    return (Array.isArray(result) ? result[0] : result)?.insertId ?? result?.insertId;
  }

  static async createBatch(numbers, projectId) {
    if (!numbers || numbers.length === 0) return 0;
    const values = numbers.map((n) => [projectId, String(n).trim(), 'pending']);
    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
    const flatParams = values.flat();
    const result = await db.query(
      `INSERT IGNORE INTO tri_numbers (project_id, number, status) VALUES ${placeholders}`,
      flatParams
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  /**
   * Sinkron daftar nomor (dari rita_phones) ke tri_numbers untuk project: insert yang belum ada (batch),
   * lalu return semua tri_number rows untuk nomor yang ada di phoneNumbers (urutan mengikuti phoneNumbers).
   * Lebih cepat daripada getOrCreate per baris untuk puluhan ribu nomor.
   */
  static async syncFromPhoneList(projectId, phoneNumbers) {
    if (!phoneNumbers || phoneNumbers.length === 0) return [];
    const normalized = phoneNumbers.map((n) => String(n).trim()).filter(Boolean);
    if (normalized.length === 0) return [];

    const existing = await db.query('SELECT id, number FROM tri_numbers WHERE project_id = ?', [projectId]);
    const existingSet = new Set((Array.isArray(existing) ? existing : []).map((r) => (r.number || '').trim()));
    const toInsert = normalized.filter((n) => !existingSet.has(n));

    const BATCH_SIZE = 1000;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + BATCH_SIZE);
      try {
        await this.createBatch(chunk, projectId);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY' && err.errno !== 1062) throw err;
      }
    }

    const all = await db.query('SELECT * FROM tri_numbers WHERE project_id = ? ORDER BY id ASC', [projectId]);
    const byNumber = {};
    for (const row of Array.isArray(all) ? all : []) {
      const num = (row.number || '').trim();
      if (num) byNumber[num] = row;
    }
    return normalized.map((n) => byNumber[n]).filter(Boolean);
  }

  static async updateStatus(id, status, packetCount = 0, lastCheckedAt = null) {
    const result = await db.query(
      'UPDATE tri_numbers SET status = ?, packet_count = ?, last_checked_at = COALESCE(?, last_checked_at) WHERE id = ?',
      [status, packetCount, lastCheckedAt, id]
    );
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async update(id, data) {
    const { number, name, status, packet_count } = data;
    const updates = [];
    const params = [];
    if (number !== undefined) { updates.push('number = ?'); params.push(number); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (packet_count !== undefined) { updates.push('packet_count = ?'); params.push(packet_count); }
    if (updates.length === 0) return false;
    params.push(id);
    const result = await db.query(
      `UPDATE tri_numbers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM tri_numbers WHERE id = ?', [id]);
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async clearProcessed() {
    const result = await db.query("DELETE FROM tri_numbers WHERE status IN ('processed', 'failed')");
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  /** Ambil semua tri_numbers di project beserta promo (tri_promo_products). Satu query JOIN agar cepat, hindari timeout. */
  static async getByProjectWithPromos(projectId) {
    const numbers = await db.query(
      'SELECT * FROM tri_numbers WHERE project_id = ? ORDER BY COALESCE(last_checked_at, updated_at) DESC, created_at DESC',
      [projectId]
    );
    const list = Array.isArray(numbers) ? numbers : [];
    if (list.length === 0) return list;

    const promosByNumberId = {};
    const allPromos = await db.query(
      `SELECT p.* FROM tri_promo_products p
       INNER JOIN tri_numbers n ON n.id = p.tri_number_id AND n.project_id = ?
       ORDER BY p.tri_number_id, p.id ASC`,
      [projectId]
    );
    const promoList = Array.isArray(allPromos) ? allPromos : [];
    for (const p of promoList) {
      const nid = p.tri_number_id;
      if (!promosByNumberId[nid]) promosByNumberId[nid] = [];
      promosByNumberId[nid].push({ ...p });
    }
    for (const row of list) {
      row.promos = promosByNumberId[row.id] || [];
    }
    return list;
  }
}

module.exports = TriNumber;
