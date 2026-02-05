const db = require('../config/database');

class IsimpleNumber {
  static async getAll(projectId = null) {
    if (projectId) {
      const rows = await db.query('SELECT * FROM isimple_numbers WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
      return Array.isArray(rows) ? rows : [];
    }
    const rows = await db.query('SELECT * FROM isimple_numbers ORDER BY created_at DESC');
    return Array.isArray(rows) ? rows : [];
  }

  static async getById(id) {
    const rows = await db.query('SELECT * FROM isimple_numbers WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  static async getByProject(projectId) {
    const rows = await db.query('SELECT * FROM isimple_numbers WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
    return Array.isArray(rows) ? rows : [];
  }

  /** Get isimple_number by project + number; create if not exists (untuk sync dari isimple_phones) */
  static async getOrCreate(projectId, number) {
    const rows = await db.query('SELECT * FROM isimple_numbers WHERE project_id = ? AND number = ? LIMIT 1', [projectId, number]);
    if (Array.isArray(rows) && rows.length > 0) return rows[0];
    const id = await this.create(number, projectId, null);
    const created = await db.query('SELECT * FROM isimple_numbers WHERE id = ?', [id]);
    return Array.isArray(created) && created.length ? created[0] : { id, project_id: projectId, number, name: null, status: 'pending' };
  }

  static async create(number, projectId = 1, name = null) {
    const result = await db.query(
      'INSERT INTO isimple_numbers (project_id, number, name, status) VALUES (?, ?, ?, ?)',
      [projectId, number, name || null, 'pending']
    );
    return (Array.isArray(result) ? result[0] : result)?.insertId ?? result?.insertId;
  }

  static async createBatch(numbers, projectId = 1) {
    const values = numbers.map(number => [projectId, number, 'pending']);
    const result = await db.query(
      'INSERT INTO isimple_numbers (project_id, number, status) VALUES ?',
      [values]
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  static async updateStatus(id, status, packetCount = 0, lastCheckedAt = null) {
    const result = await db.query(
      'UPDATE isimple_numbers SET status = ?, packet_count = ?, last_checked_at = COALESCE(?, last_checked_at) WHERE id = ?',
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
      `UPDATE isimple_numbers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM isimple_numbers WHERE id = ?', [id]);
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async clearProcessed() {
    const result = await db.query("DELETE FROM isimple_numbers WHERE status IN ('processed', 'failed')");
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  static async getByProjectWithPromos(projectId) {
    const numbers = await db.query(
      'SELECT * FROM isimple_numbers WHERE project_id = ? ORDER BY COALESCE(last_checked_at, updated_at) DESC, created_at DESC',
      [projectId]
    );
    const list = Array.isArray(numbers) ? numbers : [];
    if (list.length === 0) return list;

    const ids = list.map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const allPromos = await db.query(
      `SELECT id, isimple_number_id, product_code, product_name, product_amount, product_type, product_type_title, product_commission, product_gb, product_days, is_selected, created_at FROM promo_products WHERE isimple_number_id IN (${placeholders}) ORDER BY isimple_number_id, id ASC`,
      ids
    );
    const promosByNumberId = {};
    const promoList = Array.isArray(allPromos) ? allPromos : [];
    for (const p of promoList) {
      const nid = p.isimple_number_id;
      if (!promosByNumberId[nid]) promosByNumberId[nid] = [];
      promosByNumberId[nid].push({
        id: p.id,
        product_code: p.product_code,
        product_name: p.product_name,
        product_amount: p.product_amount,
        product_type: p.product_type,
        product_type_title: p.product_type_title,
        product_commission: p.product_commission,
        product_gb: p.product_gb,
        product_days: p.product_days,
        is_selected: p.is_selected,
        created_at: p.created_at
      });
    }
    for (const row of list) {
      row.promos = promosByNumberId[row.id] || [];
    }
    return list;
  }

  static async getPromoProductsByNumber(number, projectId = null) {
    let query = `
      SELECT pp.*, inum.number
      FROM promo_products pp
      JOIN isimple_numbers inum ON pp.isimple_number_id = inum.id
      WHERE inum.number = ?
    `;
    const params = [number];
    
    // Note: projectId filter is not available in promo_products table structure
    // if (projectId) {
    //   query += ' AND pp.project_id = ?';
    //   params.push(projectId);
    // }
    
    query += ' ORDER BY pp.created_at DESC';

    const rows = await db.query(query, params);
    return Array.isArray(rows) ? rows : [];
  }
}

module.exports = IsimpleNumber;