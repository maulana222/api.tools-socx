const axios = require('axios');
const Settings = require('../models/Settings');

/**
 * Get Transaction List from SOCX API
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, q, v } = req.query;

    // Get SOCX token from settings
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    if (!tokenSetting || !tokenSetting.value) {
      return res.status(401).json({
        success: false,
        error: 'SOCX token not found. Please set your token in settings.'
      });
    }

    const token = tokenSetting.value;

    // Get base URL from settings or default
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';

    // Build query parameters
    let queryParams = `page=${page}`;
    if (q && v) {
      queryParams += `&q=${q}&v=${v}`;
    }

    // Fetch transactions from SOCX API
    const response = await axios.get(`${baseUrl}/api/v1/transactions?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 seconds timeout
    });

    let transactions = Array.isArray(response.data) ? response.data : [];
    const maxItems = Math.min(Number(req.query.limit) || 200, 500);
    if (transactions.length > maxItems) {
      transactions = transactions.slice(0, maxItems);
    }

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total: transactions.length
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Suppliers from SOCX API
 */
exports.getSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get SOCX token from settings
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    if (!tokenSetting || !tokenSetting.value) {
      return res.status(401).json({
        success: false,
        error: 'SOCX token not found. Please set your token in settings.'
      });
    }

    const token = tokenSetting.value;

    // Get base URL from settings or default
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';

    // Fetch suppliers from SOCX API
    const response = await axios.get(`${baseUrl}/api/v1/suppliers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const suppliers = Array.isArray(response.data) ? response.data : [];
    
    res.json({
      success: true,
      data: suppliers
    });

  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suppliers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Transaction Statistics from SOCX API
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get SOCX token from settings
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    if (!tokenSetting || !tokenSetting.value) {
      return res.status(401).json({
        success: false,
        error: 'SOCX token not found. Please set your token in settings.'
      });
    }

    const token = tokenSetting.value;

    // Get base URL from settings or default
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';

    // Fetch transactions from SOCX API
    const response = await axios.get(`${baseUrl}/api/v1/transactions?page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    // Calculate stats from transactions
    let transactions = Array.isArray(response.data) ? response.data : [];
    
    // Group by request_id to handle refunds
    const refundMap = new Map(); // Map request_id -> refund transaction
    const processed = new Set();
    const stats = {
      success: 0,
      failed: 0,
      pending: 0,
      followUp: 0
    };

    // First pass: collect REFUND transactions
    transactions.forEach(tx => {
      if (tx.code === 'REFUND') {
        refundMap.set(tx.request_id, tx);
      }
    });

    // Second pass: calculate stats with merged transactions
    transactions.forEach(tx => {
      if (tx.code === 'REFUND') {
        // Skip REFUND, will be counted with original transaction
        return;
      }

      // Check if there's a refund for this request_id
      const refund = refundMap.get(tx.request_id);
      
      if (refund) {
        // Merged transaction - count as failed (refund)
        stats.failed++;
      } else if (!processed.has(tx.request_id)) {
        // No refund, count original transaction
        // done: 0 = pending, 1 = completed
        // rc: return code
        // follow_up: 0 = no, 1 = yes
        
        if (tx.follow_up === 1) {
          stats.followUp++;
        } else if (tx.done === 0) {
          stats.pending++;
        } else if (tx.rc === '00') {
          stats.success++;
        } else {
          stats.failed++;
        }
        processed.add(tx.request_id);
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Transaction Histories (log) from SOCX API
 * GET /api/v1/transactions/histories/:id
 */
exports.getTransactionHistories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID required' });
    }

    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    if (!tokenSetting || !tokenSetting.value) {
      return res.status(401).json({
        success: false,
        error: 'SOCX token not found. Please set your token in settings.'
      });
    }

    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';

    const response = await axios.get(`${baseUrl}/api/v1/transactions/histories/${id}`, {
      headers: {
        'Authorization': `Bearer ${tokenSetting.value}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const data = Array.isArray(response.data) ? response.data : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching transaction histories:', error);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || 'Gagal mengambil log transaksi',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
