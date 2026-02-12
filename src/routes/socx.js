/**
 * SOCX Routes – Simpan / Update produk ke SOCX
 *
 * === YANG PERLU DIGANTI DARI ISIMPLE → TRI ===
 * (Endpoint backend kita SAMA; yang beda: body atau path SOCX yang dipanggil)
 *
 * | Fungsi              | Isimple                         | Tri (ganti jadi)                    |
 * |---------------------|----------------------------------|--------------------------------------|
 * | Simpan 1 promo      | POST /socx/apply-promo           | POST /socx/apply-promo (SAMA)        |
 * |                     | Body tanpa provider              | Body + provider: 'tri'               |
 * |                     | → SOCX suppliers_id: 35          | → SOCX suppliers_id: 51              |
 * | Sync banyak promo   | POST /socx/isimple/sync-product-prices | TIDAK PAKAI endpoint ini;            |
 * |                     | (socx_code + promos)             | panggil apply-promo berulang         |
 * | Cek kode ada        | proxy → list/35                  | proxy → list/51                      |
 * | Daftar modul        | GET /socx/suppliers-modules/list/35 | GET /socx/suppliers-modules/list/51  |
 * |                     | (jika Tri butuh dropdown modul)  | (opsional)                           |
 *
 * === ISIMPLE (Indosat) ===
 * 1. POST /api/socx/apply-promo
 *    Body: { msisdn, product_code, product_name?, product_amount? }  (tanpa provider)
 *    → SOCX: POST /api/v1/suppliers_products (suppliers_id: 35, parameters: O4U)
 *
 * 2. POST /api/socx/isimple/sync-product-prices
 *    Body: { socx_code, promos[], suppliers_id?:35, suppliers_module_ids? }
 *    → SOCX: GET products/filter/2/2 → products_has_suppliers_modules → update suppliers_products (35).
 *
 * === TRI (Rita / Three) ===
 * 1. POST /api/socx/apply-promo
 *    Body: { provider: 'tri', product_code, product_name?, product_amount?, product_net_price?, offer_id? }
 *    → SOCX: POST /api/v1/suppliers_products (suppliers_id: 51, parameters: special_offer JSON)
 *
 * 2. Tri TIDAK pakai sync-product-prices. Sync banyak = apply-promo berulang (frontend).
 *
 * Cek kode: GET /api/v1/suppliers_products/list/35 (Isimple) vs list/51 (Tri).
 *
 * === FLOW "UPDATE PROMO KE SOCX" ===
 *
 * ISIMPLE:
 *  1. User isi Kode SOCX (socx_code) di baris produk, pilih promo (checkbox), klik tombol Update promo ke SOCX.
 *  2. Frontend: handleUpdateAllPromosToSocx(product) → validasi socx_code + matchingPromos + selected/all.
 *  3. Satu request: POST /api/socx/isimple/sync-product-prices
 *     Body: { socx_code, promos: [{ product_code, product_name, product_amount }], suppliers_id: 35, suppliers_module_ids? }
 *  4. Backend: GET products/filter/2/2 → cari produk by socx_code → GET products_has_suppliers_modules →
 *     update/create suppliers_products (supplier 35) per modul, update products price.
 *  5. Response summary → Swal sukses.
 *
 * TRI:
 *  1. User isi Kode SOCX di baris produk (tri_products), pilih promo (checkbox) atau kosongkan = semua, klik Update promo ke SOCX.
 *  2. Frontend: handleSyncSelectedPromosToSocxTri(productItem) → validasi socx_code + matchingPromos + selected/all.
 *  3. Satu request per promo: POST /api/socx/apply-promo (dalam loop)
 *     Body: { provider: 'tri', product_code, product_name?, product_amount?, product_net_price?, offer_id? }  (tanpa msisdn)
 *  4. Backend: applyPromo → POST SOCX /api/v1/suppliers_products (suppliers_id: 51, parameters: special_offer).
 *  5. Setelah semua: Swal Berhasil: n, Gagal: m.
 */
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
  const contentType = req.headers['content-type'];
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  console.log('[apply-promo] Content-Type:', contentType, '| body keys:', bodyKeys.join(', ') || '(empty)');
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
