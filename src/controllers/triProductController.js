const db = require('../config/database');

exports.getAllProducts = async (req, res) => {
  try {
    const rows = await db.query('SELECT id, name, price, socx_code, created_at, updated_at FROM tri_products ORDER BY name ASC');
    res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM tri_products WHERE id = ?', [req.params.id]);
    const product = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, socx_code } = req.body;
    const nameTrimmed = name != null ? String(name).trim() : '';
    const priceNum = Number(price) || 0;
    const socxCode = socx_code !== undefined && socx_code != null && socx_code !== '' ? String(socx_code).trim() : null;

    if (!nameTrimmed) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const result = await db.query(
      'INSERT INTO tri_products (name, price, socx_code) VALUES (?, ?, ?)',
      [nameTrimmed, priceNum, socxCode]
    );
    const id = (result && result.insertId) || (Array.isArray(result) && result[0] && result[0].insertId);
    const rows = await db.query('SELECT * FROM tri_products WHERE id = ?', [id]);
    const product = Array.isArray(rows) && rows.length ? rows[0] : { id, name: nameTrimmed, price: priceNum, socx_code: socxCode };
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, price, socx_code } = req.body;
    const id = req.params.id;
    const rows = await db.query('SELECT * FROM tri_products WHERE id = ?', [id]);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const newName = name !== undefined ? String(name).trim() : rows[0].name;
    const newPrice = price !== undefined ? Number(price) : rows[0].price;
    const newSocxCode = socx_code !== undefined ? (socx_code == null || socx_code === '' ? null : String(socx_code).trim()) : (rows[0].socx_code ?? null);
    await db.query('UPDATE tri_products SET name = ?, price = ?, socx_code = ? WHERE id = ?', [newName, newPrice, newSocxCode, id]);
    const updated = await db.query('SELECT * FROM tri_products WHERE id = ?', [id]);
    res.json({ success: true, data: Array.isArray(updated) && updated[0] ? updated[0] : { id, name: newName, price: newPrice, socx_code: newSocxCode } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tri_products WHERE id = ?', [req.params.id]);
    const affected = (result && result.affectedRows) || (Array.isArray(result) && result[0] && result[0].affectedRows) || 0;
    if (affected === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
