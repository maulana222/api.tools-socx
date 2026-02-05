const axios = require('axios');
const Settings = require('../models/Settings');

/**
 * Get Dashboard Statistics from SOCX API
 * Aggregates data from multiple SOCX endpoints
 */
exports.getDashboardStats = async (req, res) => {
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

    // Define all SOCX endpoints to fetch
    const endpoints = {
      totalDeposit: '/api/v1/reporting/total_deposit',
      totalResellersBalance: '/api/v1/reporting/total_resellers_balance',
      transactionPending: '/api/v1/reporting/transaction_pending',
      transactionSuccess: '/api/v1/reporting/transaction_success',
      totalSuppliersBalance: '/api/v1/reporting/total_suppliers_balance',
      totalTransactionsSuccess: '/api/v1/reporting/total_transactions_success',
      allTransactionToday: '/api/v1/reporting/all_transaction_today',
      transactionFailed: '/api/v1/reporting/transaction_failed',
      transactionFollowUp: '/api/v1/reporting/transaction_follow_up'
    };

    // Fetch all data from SOCX API concurrently
    const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 seconds timeout per request
        });

        return { key, data: response.data, status: 'success' };
      } catch (error) {
        console.error(`SOCX API [${endpoint}]: Error`, error.message);
        return { key, error: error.message, status: 'error' };
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(promises);

    // Aggregate data
    const stats = {
      success: true,
      data: {
        pending: 0,
        followUp: 0,
        success: 0,
        failed: 0,
        total: 0,
        totalResellerBalance: 0,
        totalTransactionSuccess: 0,
        totalDeposit: 0,
        totalSuppliersBalance: 0,
        lastUpdated: new Date().toISOString()
      },
      errors: []
    };

    // Process results
    results.forEach(({ key, data, error, status }) => {
      if (status === 'error') {
        stats.errors.push({ key, error });
        return;
      }

      // Map SOCX response to stats
      switch (key) {
        case 'transactionPending':
          stats.data.pending = data.count || 0;
          break;
        case 'transactionFollowUp':
          stats.data.followUp = data.count || 0;
          break;
        case 'transactionSuccess':
          stats.data.success = data.count || 0;
          break;
        case 'transactionFailed':
          stats.data.failed = data.count || 0;
          break;
        case 'allTransactionToday':
          stats.data.total = data.count || 0;
          break;
        case 'totalResellersBalance':
          stats.data.totalResellerBalance = data.balance || 0;
          break;
        case 'totalTransactionsSuccess':
          stats.data.totalTransactionSuccess = data.total || data.balance || 0;
          break;
        case 'totalDeposit':
          stats.data.totalDeposit = data.total || data.balance || 0;
          break;
        case 'totalSuppliersBalance':
          stats.data.totalSuppliersBalance = data.balance || 0;
          break;
      }
    });

    res.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};