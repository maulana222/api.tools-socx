const axios = require('axios');
const Settings = require('../models/Settings');

/**
 * Proxy request to SOCX API
 * Forward all requests from frontend to SOCX API using settings
 */
exports.proxySOCXRequest = async (req, res) => {
  try {
    const { method, endpoint, data } = req.body;
    const userId = req.user.id;

    // Get base URL and token from settings
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');

    // Use base URL from settings or default
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';
    
    // Check if token exists
    if (!tokenSetting || !tokenSetting.value) {
      return res.status(401).json({ 
        error: 'SOCX token not found. Please set your token in settings.' 
      });
    }

    const token = tokenSetting.value;
    
    // Construct full URL
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    
    console.log(`Proxying ${method} request to SOCX API:`, {
      endpoint,
      fullUrl,
      baseUrl
    });

    // Forward request to SOCX API
    const axiosConfig = {
      method: method || 'GET',
      url: fullUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // Add body for POST, PUT, PATCH requests
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      axiosConfig.data = data;
    }

    const socxResponse = await axios(axiosConfig);

    // Log response structure for debugging
    console.log('SOCX API Response:', {
      status: socxResponse.status,
      data: socxResponse.data
    });

    // Return SOCX response with same status code
    res.status(socxResponse.status).json(socxResponse.data);
    
  } catch (error) {
    console.error('Error proxying request to SOCX API:', error);
    
    // Try to parse error if available
    let errorMessage = 'Failed to proxy request to SOCX API';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Proxy GET request (convenience method)
 */
exports.proxyGet = async (req, res) => {
  try {
    const { endpoint } = req.params;
    
    req.body = {
      method: 'GET',
      endpoint: endpoint
    };
    
    return await exports.proxySOCXRequest(req, res);
  } catch (error) {
    console.error('Error in proxy GET:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Proxy POST request (convenience method)
 */
exports.proxyPost = async (req, res) => {
  try {
    const { endpoint } = req.params;
    
    req.body = {
      method: 'POST',
      endpoint: endpoint,
      data: req.body
    };
    
    return await exports.proxySOCXRequest(req, res);
  } catch (error) {
    console.error('Error in proxy POST:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Proxy PATCH request (convenience method)
 */
exports.proxyPatch = async (req, res) => {
  try {
    const { endpoint } = req.params;
    
    req.body = {
      method: 'PATCH',
      endpoint: endpoint,
      data: req.body
    };
    
    return await exports.proxySOCXRequest(req, res);
  } catch (error) {
    console.error('Error in proxy PATCH:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Proxy DELETE request (convenience method)
 */
exports.proxyDelete = async (req, res) => {
  try {
    const { endpoint } = req.params;
    
    req.body = {
      method: 'DELETE',
      endpoint: endpoint
    };
    
    return await exports.proxySOCXRequest(req, res);
  } catch (error) {
    console.error('Error in proxy DELETE:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get SOCX base URL from settings
 */
exports.getBaseUrl = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';
    
    res.json({
      success: true,
      data: {
        baseUrl
      }
    });
  } catch (error) {
    console.error('Error getting base URL:', error);
    res.status(500).json({ 
      error: 'Failed to get base URL from settings' 
    });
  }
};