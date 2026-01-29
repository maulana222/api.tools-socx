const Settings = require('../models/Settings');
const axios = require('axios');

// Get all user settings
exports.getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await Settings.getAll(userId);

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings'
    });
  }
};

// Validate SOCX token with SOCX API using base URL from settings
exports.validateSocxToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get token and base URL from settings
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');

    if (!tokenSetting) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          hasToken: false,
          message: 'Token belum diatur'
        }
      });
    }

    // Use base URL from settings or default
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';

    // Make request to SOCX API to verify token
    const socxResponse = await axios.get(`${baseUrl}/api/v1/users/verify`, {
      headers: {
        'Authorization': `Bearer ${tokenSetting.value}`,
        'Content-Type': 'application/json'
      }
    });

    if (!socxResponse.data) {
      throw new Error('No data returned from SOCX API');
    }

    const socxData = socxResponse.data;

    // Token is valid
    res.json({
      success: true,
      data: {
        isValid: true,
        hasToken: true,
        message: 'Token aktif dan valid',
        socxUser: socxData
      }
    });
  } catch (error) {
    console.error('Error validating SOCX token:', error);
    res.json({
      success: true,
      data: {
        isValid: false,
        hasToken: true,
        message: 'Gagal memvalidasi token'
      }
    });
  }
};

// Save or update user settings
exports.saveUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { socxToken, socxBaseUrl } = req.body;

    // Validate input
    if (!socxToken && !socxBaseUrl) {
      return res.status(400).json({
        success: false,
        message: 'At least one setting is required'
      });
    }

    // Save token if provided
    if (socxToken) {
      await Settings.set(userId, 'socx_token', socxToken);
    }

    // Save base URL if provided
    if (socxBaseUrl) {
      await Settings.set(userId, 'socx_base_url', socxBaseUrl);
    }

    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save user settings'
    });
  }
};

// Delete SOCX token
exports.deleteSocxToken = async (req, res) => {
  try {
    const userId = req.user.id;

    await Settings.delete(userId, 'socx_token');

    res.json({
      success: true,
      message: 'SOCX token deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting SOCX token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SOCX token'
    });
  }
};