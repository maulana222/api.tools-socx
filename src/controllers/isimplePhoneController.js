const database = require('../config/database');

// Get all isimple phones (with pagination and optional search; uses only columns that exist: id, phone_number, created_at)
const getAllIsimplePhones = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const searchRaw = req.query.search != null ? String(req.query.search).trim() : '';
    const searchPattern = searchRaw ? `%${searchRaw}%` : null;

    const countSql = searchPattern
      ? 'SELECT COUNT(*) as total FROM isimple_phones WHERE phone_number LIKE ?'
      : 'SELECT COUNT(*) as total FROM isimple_phones';
    const countParams = searchPattern ? [searchPattern] : [];
    const countRows = await database.query(countSql, countParams);
    const total = Number(countRows[0]?.total ?? 0);

    const listSql = searchPattern
      ? 'SELECT id, phone_number, created_at FROM isimple_phones WHERE phone_number LIKE ? ORDER BY id ASC LIMIT ? OFFSET ?'
      : 'SELECT id, phone_number, created_at FROM isimple_phones ORDER BY id ASC LIMIT ? OFFSET ?';
    const listParams = searchPattern ? [searchPattern, limit, offset] : [limit, offset];
    const phones = await database.query(listSql, listParams);

    const data = phones.map((p) => ({
      id: p.id,
      number: p.phone_number,
      created_at: p.created_at
    }));

    res.json({ success: true, data, total });
  } catch (error) {
    console.error('Error fetching isimple phones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch isimple phones',
      message: error.message
    });
  }
};

// Get isimple phone by ID
const getIsimplePhoneById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ip.*,
        p.name as project_name,
        p.code as project_code
      FROM isimple_phones ip
      LEFT JOIN projects p ON ip.project_id = p.id
      WHERE ip.id = ?
    `;
    
    const phones = await database.query(query, [id]);
    
    if (phones.length === 0) {
      return res.status(404).json({ error: 'Isimple phone not found' });
    }
    
    const phone = phones[0];
    const formattedPhone = {
      id: phone.id,
      number: phone.phone_number,
      status: phone.status,
      packet_count: phone.packet_count,
      last_checked_at: phone.last_checked_at,
      project_id: phone.project_id,
      project: phone.project_id ? {
        id: phone.project_id,
        name: phone.project_name,
        code: phone.project_code
      } : null,
      created_at: phone.created_at,
      updated_at: phone.updated_at
    };
    
    res.json(formattedPhone);
  } catch (error) {
    console.error('Error fetching isimple phone:', error);
    res.status(500).json({ 
      error: 'Failed to fetch isimple phone',
      message: error.message 
    });
  }
};

// Create isimple phone (schema-safe: only phone_number)
const createIsimplePhone = async (req, res) => {
  try {
    const { phone_number } = req.body;
    const normalized = phone_number != null ? String(phone_number).trim() : '';

    if (!normalized) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const existing = await database.query('SELECT id FROM isimple_phones WHERE phone_number = ?', [normalized]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Phone number already exists' });
    }

    const result = await database.query('INSERT INTO isimple_phones (phone_number) VALUES (?)', [normalized]);
    const newPhone = await database.query(
      'SELECT id, phone_number, created_at FROM isimple_phones WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      id: newPhone[0].id,
      number: newPhone[0].phone_number,
      created_at: newPhone[0].created_at
    });
  } catch (error) {
    console.error('Error creating isimple phone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create isimple phone',
      message: error.message
    });
  }
};

// Batch create isimple phones (schema-safe: only phone_number)
const batchCreateIsimplePhones = async (req, res) => {
  try {
    const { numbers } = req.body;

    if (!numbers || !Array.isArray(numbers)) {
      return res.status(400).json({ success: false, error: 'Numbers array is required' });
    }

    const createdPhones = [];
    const errors = [];

    for (const raw of numbers) {
      const phone_number = raw != null ? String(raw).trim() : '';
      if (!phone_number) continue;
      try {
        const existing = await database.query('SELECT id FROM isimple_phones WHERE phone_number = ?', [phone_number]);
        if (existing.length > 0) {
          errors.push({ phone_number, message: 'Phone number already exists' });
        } else {
          const result = await database.query('INSERT INTO isimple_phones (phone_number) VALUES (?)', [phone_number]);
          const newPhone = await database.query(
            'SELECT id, phone_number, created_at FROM isimple_phones WHERE id = ?',
            [result.insertId]
          );
          createdPhones.push({
            id: newPhone[0].id,
            number: newPhone[0].phone_number,
            created_at: newPhone[0].created_at
          });
        }
      } catch (err) {
        errors.push({ phone_number, message: err.message });
      }
    }

    res.status(201).json({
      success: true,
      created: createdPhones.length,
      data: createdPhones,
      errors
    });
  } catch (error) {
    console.error('Error batch creating isimple phones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create isimple phones',
      message: error.message
    });
  }
};

// Update isimple phone
const updateIsimplePhone = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number, status, packet_count, last_checked_at, project_id } = req.body;
    
    // Check if phone exists
    const existingPhones = await database.query(
      'SELECT * FROM isimple_phones WHERE id = ?',
      [id]
    );
    
    if (existingPhones.length === 0) {
      return res.status(404).json({ error: 'Isimple phone not found' });
    }
    
    // Check if new phone number already exists (if phone_number is being changed)
    if (phone_number && phone_number !== existingPhones[0].phone_number) {
      const checkDuplicate = await database.query(
        'SELECT id FROM isimple_phones WHERE phone_number = ? AND id != ?',
        [phone_number, id]
      );
      
      if (checkDuplicate.length > 0) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }
    
    const updates = [];
    const params = [];
    
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (packet_count !== undefined) {
      updates.push('packet_count = ?');
      params.push(packet_count);
    }
    if (last_checked_at !== undefined) {
      updates.push('last_checked_at = ?');
      params.push(last_checked_at);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      params.push(project_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    await database.query(
      `UPDATE isimple_phones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedPhone = await database.query(
      'SELECT * FROM isimple_phones WHERE id = ?',
      [id]
    );
    
    res.json({
      id: updatedPhone[0].id,
      number: updatedPhone[0].phone_number,
      status: updatedPhone[0].status,
      packet_count: updatedPhone[0].packet_count,
      last_checked_at: updatedPhone[0].last_checked_at,
      project_id: updatedPhone[0].project_id,
      created_at: updatedPhone[0].created_at,
      updated_at: updatedPhone[0].updated_at
    });
  } catch (error) {
    console.error('Error updating isimple phone:', error);
    res.status(500).json({ 
      error: 'Failed to update isimple phone',
      message: error.message 
    });
  }
};

// Bulk delete by count: hapus N baris teratas (ORDER BY id ASC)
const bulkDeleteByCount = async (req, res) => {
  try {
    const count = parseInt(req.body?.count ?? req.query?.count, 10);
    if (!Number.isInteger(count) || count < 1) {
      return res.status(400).json({ success: false, message: 'count must be a positive number' });
    }
    const maxCount = 10000;
    const toDelete = Math.min(count, maxCount);

    const ids = await database.query(
      'SELECT id FROM isimple_phones ORDER BY id ASC LIMIT ?',
      [toDelete]
    );
    if (ids.length === 0) {
      return res.json({ success: true, deleted: 0 });
    }
    const idList = ids.map((r) => r.id).join(',');
    await database.query(`DELETE FROM isimple_phones WHERE id IN (${idList})`);
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Error bulk deleting isimple phones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete',
      message: error.message
    });
  }
};

// Delete isimple phone
const deleteIsimplePhone = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.query(
      'DELETE FROM isimple_phones WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Isimple phone not found' });
    }

    res.json({ message: 'Isimple phone deleted successfully' });
  } catch (error) {
    console.error('Error deleting isimple phone:', error);
    res.status(500).json({
      error: 'Failed to delete isimple phone',
      message: error.message
    });
  }
};

// Update phone status after checking
const updatePhoneAfterCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, packet_count } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Check if phone exists
    const existingPhones = await database.query(
      'SELECT * FROM isimple_phones WHERE id = ?',
      [id]
    );
    
    if (existingPhones.length === 0) {
      return res.status(404).json({ error: 'Isimple phone not found' });
    }
    
    const updates = [];
    const params = [];
    
    updates.push('status = ?');
    params.push(status);
    
    if (packet_count !== undefined) {
      updates.push('packet_count = ?');
      params.push(packet_count);
    }
    
    updates.push('last_checked_at = NOW()');
    
    params.push(id);
    
    await database.query(
      `UPDATE isimple_phones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedPhone = await database.query(
      'SELECT * FROM isimple_phones WHERE id = ?',
      [id]
    );
    
    res.json({
      id: updatedPhone[0].id,
      number: updatedPhone[0].phone_number,
      status: updatedPhone[0].status,
      packet_count: updatedPhone[0].packet_count,
      last_checked_at: updatedPhone[0].last_checked_at,
      project_id: updatedPhone[0].project_id,
      created_at: updatedPhone[0].created_at,
      updated_at: updatedPhone[0].updated_at
    });
  } catch (error) {
    console.error('Error updating phone after check:', error);
    res.status(500).json({ 
      error: 'Failed to update phone',
      message: error.message 
    });
  }
};

module.exports = {
  getAllIsimplePhones,
  getIsimplePhoneById,
  createIsimplePhone,
  batchCreateIsimplePhones,
  updateIsimplePhone,
  deleteIsimplePhone,
  bulkDeleteByCount,
  updatePhoneAfterCheck
};
