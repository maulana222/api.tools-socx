const express = require('express');
const SettingsController = require('../controllers/settingsController');
const SocxProxyController = require('../controllers/socxProxyController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all user settings
router.get('/settings', SettingsController.getUserSettings);

// Validate SOCX token with SOCX API
router.get('/settings/validate-token', SettingsController.validateSocxToken);

// Save or update user settings
router.post('/settings', SettingsController.saveUserSettings);

// Delete SOCX token
router.delete('/settings/token', SettingsController.deleteSocxToken);

// Get SOCX base URL from settings
router.get('/proxy/base-url', SocxProxyController.getBaseUrl);

// Proxy request to SOCX API (generic)
router.post('/proxy/request', SocxProxyController.proxySOCXRequest);

// Proxy convenience methods
router.post('/proxy/get/:endpoint(*)', SocxProxyController.proxyGet);
router.post('/proxy/post/:endpoint(*)', SocxProxyController.proxyPost);
router.post('/proxy/patch/:endpoint(*)', SocxProxyController.proxyPatch);
router.post('/proxy/delete/:endpoint(*)', SocxProxyController.proxyDelete);

module.exports = router;
