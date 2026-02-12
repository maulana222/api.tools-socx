const express = require('express');
const SettingsController = require('../controllers/settingsController');
const SocxProxyController = require('../controllers/socxProxyController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Debug: Log all requests to socx routes
router.use((req, res, next) => {
  console.log(`[SOCX Route] ${req.method} ${req.path}`);
  next();
});

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

// Apply promo ke SOCX (order/register) - HARUS SEBELUM /proxy/* untuk menghindari konflik
router.post('/apply-promo', async (req, res, next) => {
  console.log('[Route Debug] POST /apply-promo called');
  console.log('[Route Debug] Method:', req.method);
  console.log('[Route Debug] Path:', req.path);
  console.log('[Route Debug] Original URL:', req.originalUrl);
  console.log('[Route Debug] Body:', JSON.stringify(req.body, null, 2));
  try {
    await SocxProxyController.applyPromo(req, res);
  } catch (error) {
    next(error);
  }
});

// Sync harga Isimple → SOCX (ambil product by code, update suppliers_products + products)
router.post('/isimple/sync-product-prices', SocxProxyController.syncIsimpleProductPrices);

// Daftar modul per supplier (untuk dropdown Modul di Daftar Produk Harga Pasar)
router.get('/suppliers-modules/list/:supplierId', SocxProxyController.getSuppliersModulesList);

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
