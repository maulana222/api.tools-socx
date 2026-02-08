const db = require('../config/database');

// Get all (harga pasaran referensi)
exports.getAllProducts = async (req, res) => {
  try {
    const rows = await db.query('SELECT id, name, price, socx_code, created_at, updated_at FROM isimple_products ORDER BY name ASC');
    res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
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

// Update (name, price, socx_code)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, socx_code } = req.body;
    const id = req.params.id;
    const rows = await db.query('SELECT * FROM isimple_products WHERE id = ?', [id]);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const newName = name !== undefined ? name : rows[0].name;
    const newPrice = price !== undefined ? Number(price) : rows[0].price;
    const newSocxCode = socx_code !== undefined ? (socx_code == null || socx_code === '' ? null : String(socx_code).trim()) : (rows[0].socx_code ?? null);
    await db.query('UPDATE isimple_products SET name = ?, price = ?, socx_code = ? WHERE id = ?', [newName, newPrice, newSocxCode, id]);
    const updated = await db.query('SELECT * FROM isimple_products WHERE id = ?', [id]);
    res.json({ success: true, data: Array.isArray(updated) && updated[0] ? updated[0] : { id, name: newName, price: newPrice, socx_code: newSocxCode } });
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
