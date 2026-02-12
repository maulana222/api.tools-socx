const db = require('../config/database');

function normalizeModuleIds(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
  if (typeof val === 'string') {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr.map((id) => Number(id)).filter((n) => !Number.isNaN(n)) : [];
    } catch (_) { return []; }
  }
  return [];
}

// Get all (harga pasaran referensi)
exports.getAllProducts = async (req, res) => {
  try {
    const rows = await db.query('SELECT id, name, price, socx_code, module_id, module_ids, created_at, updated_at FROM isimple_products ORDER BY name ASC');
    const data = (Array.isArray(rows) ? rows : []).map((r) => ({
      ...r,
      module_ids: normalizeModuleIds(r.module_ids)
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get by ID
exports.getProductById = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM isimple_products WHERE id = ?', [req.params.id]);
    const product = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    product.module_ids = normalizeModuleIds(product.module_ids);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create — terima gb + days + category (+ price), backend menyusun nama; jika sensasi: "Indosat Freedom Internet Sensasi X GB Y Hari"
exports.createProduct = async (req, res) => {
  try {
    const { gb, days, price, name, category } = req.body;
    const priceNum = Number(price) || 0;
    const isSensasi = String(category || '').toLowerCase() === 'sensasi';

    let nameToSave;
    if (gb != null && days != null) {
      const gbNum = Number(gb) || 0;
      const daysNum = Number(days) || 0;
      if (gbNum <= 0 || daysNum <= 0) {
        return res.status(400).json({ success: false, message: 'gb and days must be greater than 0' });
      }
      const middle = isSensasi ? 'Sensasi ' : '';
      nameToSave = `Indosat Freedom Internet ${middle}${gbNum} GB ${daysNum} Hari`;
    } else if (name) {
      const prefix = 'Indosat Freedom Internet ';
      const nameTrimmed = String(name).trim();
      nameToSave = nameTrimmed.startsWith(prefix) ? nameTrimmed : `${prefix}${nameTrimmed}`;
    } else {
      return res.status(400).json({ success: false, message: 'Send gb and days, or name and price' });
    }

    if (price === undefined || priceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Price is required and must be greater than 0' });
    }

    const result = await db.query(
      'INSERT INTO isimple_products (name, price) VALUES (?, ?)',
      [nameToSave, priceNum]
    );
    const id = (result && result.insertId) || (Array.isArray(result) && result[0] && result[0].insertId);
    const rows = await db.query('SELECT * FROM isimple_products WHERE id = ?', [id]);
    const product = Array.isArray(rows) && rows.length ? rows[0] : { id, name: nameToSave, price: priceNum };
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update (name, price, socx_code, module_id, module_ids)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, socx_code, module_id, module_ids } = req.body;
    const id = req.params.id;
    const rows = await db.query('SELECT * FROM isimple_products WHERE id = ?', [id]);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const newName = name !== undefined ? name : rows[0].name;
    const newPrice = price !== undefined ? Number(price) : rows[0].price;
    const newSocxCode = socx_code !== undefined ? (socx_code == null || socx_code === '' ? null : String(socx_code).trim()) : (rows[0].socx_code ?? null);
    const newModuleId = module_id !== undefined ? (module_id === '' || module_id == null ? null : Number(module_id)) : (rows[0].module_id ?? null);
    const newModuleIds = module_ids !== undefined
      ? (Array.isArray(module_ids) ? module_ids : [])
          .map((id) => Number(id))
          .filter((n) => !Number.isNaN(n))
      : normalizeModuleIds(rows[0].module_ids);
    const moduleIdsJson = newModuleIds.length > 0 ? JSON.stringify(newModuleIds) : null;
    await db.query(
      'UPDATE isimple_products SET name = ?, price = ?, socx_code = ?, module_id = ?, module_ids = ? WHERE id = ?',
      [newName, newPrice, newSocxCode, newModuleId, moduleIdsJson, id]
    );
    const updated = await db.query('SELECT * FROM isimple_products WHERE id = ?', [id]);
    const out = Array.isArray(updated) && updated[0] ? updated[0] : { id, name: newName, price: newPrice, socx_code: newSocxCode, module_id: newModuleId, module_ids: newModuleIds };
    if (out.module_ids != null && typeof out.module_ids !== 'object') out.module_ids = normalizeModuleIds(out.module_ids);
    else if (out.module_ids == null) out.module_ids = newModuleIds;
    res.json({ success: true, data: out });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteProduct = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM isimple_products WHERE id = ?', [req.params.id]);
    const affected = (result && result.affectedRows) || (Array.isArray(result) && result[0] && result[0].affectedRows) || 0;
    if (affected === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
