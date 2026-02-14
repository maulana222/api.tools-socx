const db = require('../config/database');

class PromoProduct {
  static async getByIsimpleNumberId(isimpleNumberId) {
    const rows = await db.query(
      'SELECT * FROM promo_products WHERE isimple_number_id = ? ORDER BY id ASC',
      [isimpleNumberId]
    );
    return Array.isArray(rows) ? rows : [];
  }

  static async getById(id) {
    const rows = await db.query('SELECT * FROM promo_products WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  static async create(data) {
    const {
      isimpleNumberId,
      productName,
      productCode,
      productAmount,
      productType,
      productTypeTitle,
      productCommission,
      productGb,
      productDays,
      isSelected = false
    } = data;

    const result = await db.query(
      `INSERT INTO promo_products 
       (isimple_number_id, product_name, product_code, product_amount, product_type, 
        product_type_title, product_commission, product_gb, product_days, is_selected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        isimpleNumberId,
        productName,
        productCode,
        productAmount,
        productType,
        productTypeTitle,
        productCommission,
        productGb,
        productDays,
        isSelected
      ]
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.insertId ?? result?.insertId;
  }

  static async createBatch(isimpleNumberId, products) {
    if (!products || products.length === 0) return 0;

    const cols = '(isimple_number_id, product_name, product_code, product_amount, product_type, product_type_title, product_commission, product_gb, product_days, is_selected)';
    const placeholders = products.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = products.flatMap(p => [
      isimpleNumberId,
      p.productName || (p.name ? `Product ${p.name}` : 'Unknown Product'),
      p.productCode || (p.dnmcode ? `Code ${p.dnmcode}` : 'unknown'),
      p.productAmount || (p.amount || 0),
      p.productType || (p.type || 'unknown'),
      p.productTypeTitle || (p.typetitle || ''),
      p.productCommission || (p.commision || 0),
      p.productGb || (p.product_gb || 0),
      p.productDays || (p.product_days || 0),
      p.is_selected || false
    ]);

    const result = await db.query(
      `INSERT INTO promo_products ${cols} VALUES ${placeholders}`,
      params
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  /**
   * Merge promo hasil cek: tambah yang baru, update yang sudah ada (by product_code per isimple_number_id).
   * Dipakai saat "Mulai Cek Promo" diklik lagi: hanya update/tambah, tidak hapus semua.
   * ON DUPLICATE KEY UPDATE memakai UNIQUE (isimple_number_id, product_code). is_selected tidak di-overwrite agar pilihan user tetap.
   */
  static async upsertBatch(isimpleNumberId, products) {
    if (!products || products.length === 0) return 0;

    const cols = '(isimple_number_id, product_name, product_code, product_amount, product_type, product_type_title, product_commission, product_gb, product_days, is_selected)';
    const placeholders = products.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = products.flatMap(p => [
      isimpleNumberId,
      p.productName || (p.name ? `Product ${p.name}` : 'Unknown Product'),
      p.productCode || (p.dnmcode ? `Code ${p.dnmcode}` : 'unknown'),
      p.productAmount || (p.amount || 0),
      p.productType || (p.type || 'unknown'),
      p.productTypeTitle || (p.typetitle || ''),
      p.productCommission || (p.commision || 0),
      p.productGb || (p.product_gb || 0),
      p.productDays || (p.product_days || 0),
      p.is_selected || false
    ]);

    const updateClause = [
      'product_name = VALUES(product_name)',
      'product_amount = VALUES(product_amount)',
      'product_type = VALUES(product_type)',
      'product_type_title = VALUES(product_type_title)',
      'product_commission = VALUES(product_commission)',
      'product_gb = VALUES(product_gb)',
      'product_days = VALUES(product_days)'
      // is_selected tidak di-update agar pilihan user (is_selected) tetap
    ].join(', ');

    const result = await db.query(
      `INSERT INTO promo_products ${cols} VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateClause}`,
      params
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  /** Jumlah baris promo_products untuk satu isimple_number_id (setelah merge, untuk update packet_count). */
  static async countByIsimpleNumberId(isimpleNumberId) {
    const rows = await db.query(
      'SELECT COUNT(*) AS cnt FROM promo_products WHERE isimple_number_id = ?',
      [isimpleNumberId]
    );
    const r = Array.isArray(rows) && rows.length ? rows[0] : { cnt: 0 };
    return Number(r.cnt) || 0;
  }

  static async updateSelected(id, isSelected) {
    const result = await db.query(
      'UPDATE promo_products SET is_selected = ? WHERE id = ?',
      [isSelected, id]
    );
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM promo_products WHERE id = ?', [id]);
    const r = Array.isArray(result) ? result[0] : result;
    return (r?.affectedRows ?? 0) > 0;
  }

  static async deleteByIsimpleNumberId(isimpleNumberId) {
    const result = await db.query(
      'DELETE FROM promo_products WHERE isimple_number_id = ?',
      [isimpleNumberId]
    );
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }

  static async getSelectedProducts() {
    const rows = await db.query(
      'SELECT * FROM promo_products WHERE is_selected = TRUE ORDER BY created_at DESC'
    );
    return Array.isArray(rows) ? rows : [];
  }

  static async getSelectedProductsByProject(projectId) {
    // Note: This method cannot be implemented as promo_products doesn't have project_id
    // and the relationship structure doesn't support filtering by project
    return [];
  }

  static async getStatsByIsimpleNumberId(isimpleNumberId) {
    const rows = await db.query(
      'SELECT COUNT(*) as total_products, ' +
      'SUM(CASE WHEN is_selected = TRUE THEN 1 ELSE 0 END) as selected_products ' +
      'FROM promo_products WHERE isimple_number_id = ?',
      [isimpleNumberId]
    );
    return Array.isArray(rows) && rows.length ? rows[0] : { total_products: 0, selected_products: 0 };
  }

  static async getAll() {
    const rows = await db.query(`
      SELECT pp.*, 
             inumber.number as isimple_number
      FROM promo_products pp
      LEFT JOIN isimple_numbers inumber ON pp.isimple_number_id = inumber.id
      ORDER BY pp.created_at DESC
    `);
    return rows;
  }

  static async getAllByProjectId(projectId) {
    // Note: This method cannot be implemented as promo_products doesn't have project_id
    // and the relationship is through product_code = number, not through isimple_number_id
    return [];
  }

  /** Jumlah nomor (distinct) per product_code untuk satu project. Return { product_code: number } */
  static async getCountsByProductCodePerProject(projectId) {
    const rows = await db.query(
      `SELECT pp.product_code, COUNT(DISTINCT pp.isimple_number_id) AS jumlah_nomor
       FROM promo_products pp
       INNER JOIN isimple_numbers inum ON pp.isimple_number_id = inum.id
       WHERE inum.project_id = ?
       GROUP BY pp.product_code`,
      [projectId]
    );
    const list = Array.isArray(rows) ? rows : [];
    const result = {};
    list.forEach((r) => {
      const code = r.product_code ? String(r.product_code).trim() : '';
      if (code) result[code] = Number(r.jumlah_nomor) || 0;
    });
    return result;
  }

  /** Total jumlah nomor (isimple_numbers) di project untuk hitung rate */
  static async getTotalNumbersByProjectId(projectId) {
    const rows = await db.query(
      'SELECT COUNT(*) AS total FROM isimple_numbers WHERE project_id = ?',
      [projectId]
    );
    const r = Array.isArray(rows) && rows.length ? rows[0] : { total: 0 };
    return Number(r.total) || 0;
  }
}

module.exports = PromoProduct;