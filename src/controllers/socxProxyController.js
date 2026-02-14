const axios = require('axios');
const Settings = require('../models/Settings');

/** Endpoint SOCX untuk order/apply promo */
// Endpoint yang benar untuk apply promo: /api/v1/suppliers_products (POST)
const SOCX_ORDER_ENDPOINT = '/api/v1/suppliers_products';

// ====== ISIMPLE SYNC PRICE ======
// products/filter/{providers_id}/{categories_id} — provider 1 = Indosat, 2 = lain; category 2 = data
const SOCX_PRODUCTS_FILTER_PREFIX = '/api/v1/products/filter/';
// products_has_suppliers_modules/product/{products_id}
const SOCX_PRODUCTS_HAS_MODULES_PREFIX = '/api/v1/products_has_suppliers_modules/product/';
const SOCX_PRODUCTS_HAS_MODULES_CREATE = '/api/v1/products_has_suppliers_modules';
const SOCX_PRODUCTS_HAS_MODULES_PATCH_PREFIX = '/api/v1/products_has_suppliers_modules/';
// update price endpoints
const SOCX_UPDATE_SUPPLIERS_PRICE_ENDPOINT = '/api/v1/suppliers_products/update_price';
const SOCX_UPDATE_PRODUCTS_PRICE_ENDPOINT = '/api/v1/products/update_price';
// suppliers endpoints (untuk cari/create entry baru)
const SOCX_SUPPLIERS_PRODUCTS_LIST_PREFIX = '/api/v1/suppliers_products/list/';
const SOCX_SUPPLIERS_PRODUCTS_CREATE = '/api/v1/suppliers_products';
const SOCX_SUPPLIERS_MODULES_LIST_PREFIX = '/api/v1/suppliers_modules/list/';

async function getSocxAuth(req) {
  const userId = req.user?.id;
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
  const tokenSetting = await Settings.getByKey(userId, 'socx_token');
  const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';
  const token = tokenSetting?.value;
  if (!token) {
    const err = new Error('SOCX token tidak ditemukan. Set token di Settings.');
    err.status = 401;
    throw err;
  }
  return { baseUrl, token };
}

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

    // Return SOCX response with same status code
    res.status(socxResponse.status).json(socxResponse.data);
    
  } catch (error) {
    console.error('Error proxying request to SOCX API:', error);
    
    const status = error.response?.status;
    const data = error.response?.data;
    const socxMessage = data?.message || data?.error;
    
    // 401 dari SOCX = token SOCX (di Settings) expired/invalid — bukan token login app
    if (status === 401) {
      const msg = socxMessage && /expired|invalid|jwt/i.test(String(socxMessage))
        ? 'SOCX token kadaluarsa atau tidak valid. Silakan perbarui SOCX Token di Pengaturan (Settings).'
        : (socxMessage || 'Unauthorized');
      return res.status(401).json({ error: msg, code: 'SOCX_TOKEN_INVALID' });
    }
    
    let errorMessage = 'Failed to proxy request to SOCX API';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    res.status(status && status >= 400 ? status : 500).json({ 
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

/** Supplier ID SOCX: 35 = iSimple/Indosat, 51 = Tri (Rita / special_offer) */
const SOCX_SUPPLIER_ID_ISIMPLE = 35;
const SOCX_SUPPLIER_ID_TRI = Number(process.env.SOCX_SUPPLIER_ID_TRI || 51);

/**
 * Apply/order promo ke SOCX (msisdn + product_code).
 * Body: { msisdn, product_code, product_name?, product_amount?, product_net_price?, offer_id?, provider? }
 * - provider: 'tri' → format Tri (special_offer), suppliers_id 51, base_price = netPrice.
 */
exports.applyPromo = async (req, res) => {
  try {
    // Body bisa langsung di req.body (Express json) atau dibungkus req.body.body (beberapa client)
    let body = req.body || {};
    if (body && typeof body.body === 'object' && body.body !== null) {
      body = body.body;
    }
    const { msisdn, product_name, product_amount, product_net_price, offer_id, provider } = body;
    const product_code = body.product_code ?? body.productCode ?? '';
    const isTri = String(provider || '').toLowerCase() === 'tri';

    if (!product_code || String(product_code).trim() === '') {
      const receivedKeys = body && typeof body === 'object' ? Object.keys(body).join(', ') : 'none';
      return res.status(400).json({
        message: 'product_code wajib',
        error: `product_code wajib. Received keys: ${receivedKeys}`,
        success: false
      });
    }
    if (!isTri && !msisdn) {
      return res.status(400).json({
        message: 'msisdn wajib untuk Isimple',
        error: 'msisdn wajib untuk Isimple',
        success: false
      });
    }

    const { baseUrl, token } = await getSocxAuth(req);

    const url = `${baseUrl}${SOCX_ORDER_ENDPOINT}`;
    let payload;

    if (isTri) {
      // Tri (Rita): format seperti SOCX — name=offerShortDesc, code=registrationKey, base_price=netPrice, parameters=JSON special_offer
      const netVal = product_net_price != null && product_net_price !== '' ? Number(product_net_price) : (product_amount != null ? Number(product_amount) : 0);
      const parameters = {
        type: 'special_offer',
        offerId: offer_id != null && String(offer_id).trim() !== '' ? String(offer_id).trim() : String(product_code).trim(),
        offerShortDesc: String(product_name || product_code).trim(),
        productPrice: product_amount != null && product_amount !== '' ? String(product_amount) : '0',
        registrationKey: String(product_code).trim(),
        netPrice: String(netVal)
      };
      payload = {
        name: product_name || product_code,
        code: product_code,
        parameters: JSON.stringify(parameters),
        base_price: netVal,
        trx_per_day: 100,
        suppliers_id: SOCX_SUPPLIER_ID_TRI,
        regex_custom_info: ''
      };
    } else {
      // iSimple (Indosat): format O4U
      payload = {
        name: product_name || product_code,
        code: product_code,
        parameters: JSON.stringify({ type: 'O4U' }),
        base_price: product_amount || 0,
        trx_per_day: 100,
        suppliers_id: SOCX_SUPPLIER_ID_ISIMPLE,
        regex_custom_info: '',
        msisdn
      };
    }

    console.log('[Apply Promo] Request to SOCX:', url, isTri ? '(Tri)' : '(iSimple)');
    console.log('[Apply Promo] Payload:', JSON.stringify(payload, null, 2));

    const socxResponse = await axios.post(url, payload, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Apply Promo] Response status:', socxResponse.status);
    res.status(socxResponse.status).json(socxResponse.data);
  } catch (error) {
    console.error('[Apply Promo] Error:', error.message);
    if (error.response) {
      console.error('[Apply Promo] Response status:', error.response.status);
      console.error('[Apply Promo] Response data:', error.response.data);
    }
    const status = error.response?.status || 500;
    const data = error.response?.data;
    const errMsg = data?.message || data?.error || error.message || 'Gagal mengirim ke SOCX';
    res.status(status).json(data || {
      message: errMsg,
      error: errMsg,
      success: false
    });
  }
};

/**
 * Sync/update harga promo Isimple ke SOCX untuk 1 produk Indosat (berdasarkan socx_code).
 * Alur:
 * 1) GET products/filter/1/2 → cari product by code (mis IF14) → ambil products_id & price sekarang
 * 2) GET products_has_suppliers_modules/product/{products_id} → dapat daftar suppliers_products_id per product_code
 * 3) Untuk setiap promo dari frontend: kalau product_code ditemukan → update suppliers_products price (jika beda)
 * 4) Update products price dengan harga terbesar dari promo yang match (jika beda)
 *
 * Body: { socx_code, promos, suppliers_id?, suppliers_module_id?, suppliers_module_ids? }
 * - suppliers_module_id: satu modul (backward compat).
 * - suppliers_module_ids: array modul [40, 42] — hanya modul ini yang dipakai; kosong/tidak kirim = semua modul.
 */
const isDev = process.env.NODE_ENV !== 'production';
const logSync = (...args) => { if (isDev) console.log('[SOCX Sync]', ...args); };

/** Ambil array modules dari response SOCX GET products_has_suppliers_modules/product/{id} (format bisa bervariasi). */
function parseModulesResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.modules)) return data.data.modules;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.modules && Array.isArray(data.modules)) return data.modules;
  if (data.items && Array.isArray(data.items)) return data.items;
  return [];
}

/** Ambil suppliers_modules_id dari satu entry (SOCX bisa pakai suppliers_modules_id atau suppliers_module_id). */
function getEntryModuleId(entry) {
  if (entry == null) return undefined;
  const id = entry.suppliers_modules_id ?? entry.suppliers_module_id ?? entry.supplier_modules_id;
  const n = Number(id);
  return Number.isNaN(n) ? undefined : n;
}

function parseSelectedModuleIds(suppliers_module_id, suppliers_module_ids) {
  const arr = Array.isArray(suppliers_module_ids) ? suppliers_module_ids : [];
  const ids = arr.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
  if (ids.length > 0) return ids;
  if (suppliers_module_id != null && suppliers_module_id !== '') {
    const one = Number(suppliers_module_id);
    if (!Number.isNaN(one)) return [one];
  }
  return null;
}

exports.syncIsimpleProductPrices = async (req, res) => {
  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (body && typeof body.body === 'object' && body.body !== null) body = body.body;
    const { socx_code, promos, providers_id, categories_id, suppliers_id, suppliers_module_id, suppliers_module_ids } = body;
    const code = socx_code != null ? String(socx_code).trim() : '';
    const list = Array.isArray(promos) ? promos : [];
    logSync('Request body: socx_code:', code, '| promos:', list.length, '| suppliers_module_ids:', suppliers_module_ids, '| suppliers_module_id:', suppliers_module_id);
    // Default: providers_id = 2 (Indosat), categories_id = 2 (data) — sesuai contoh dari SOCX
    const providerId = providers_id != null ? Number(providers_id) : 2;
    const categoryId = categories_id != null ? Number(categories_id) : 2;
    // suppliers_id untuk iSimple (default 35)
    const supplierId = suppliers_id != null ? Number(suppliers_id) : 35;
    const selectedModuleIds = parseSelectedModuleIds(suppliers_module_id, suppliers_module_ids);
    if (!code) {
      return res.status(400).json({ success: false, message: 'socx_code wajib diisi' });
    }
    if (list.length === 0) {
      return res.status(400).json({ success: false, message: 'promos kosong' });
    }

    const filterEndpoint = `${SOCX_PRODUCTS_FILTER_PREFIX}${providerId}/${categoryId}`;
    logSync('Mulai sync | socx_code:', code, '| promos:', list.length, '| filter:', filterEndpoint);
    list.forEach((p, i) => logSync('  promo', i + 1, ':', p.product_code, '→', p.product_amount));

    const { baseUrl, token } = await getSocxAuth(req);
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Step 1: GET products/filter/{providers_id}/{categories_id}
    logSync('Step 1: GET', filterEndpoint);
    const productsResp = await axios.get(`${baseUrl}${filterEndpoint}`, { timeout: 30000, headers });
    const products = Array.isArray(productsResp.data) ? productsResp.data : (productsResp.data?.data || []);
    const socxProduct = (Array.isArray(products) ? products : []).find((p) => String(p.code || '').toUpperCase() === code.toUpperCase());
    if (!socxProduct) {
      logSync('Step 1: produk tidak ditemukan, code:', code);
      return res.status(404).json({ success: false, message: `Produk SOCX dengan code "${code}" tidak ditemukan` });
    }
    logSync('Step 1: produk ditemukan | id:', socxProduct.id, '| code:', socxProduct.code, '| name:', socxProduct.name, '| price:', socxProduct.price);

    // Step 2: ambil struktur products_has_suppliers_modules untuk product ini
    const modulesUrl = `${SOCX_PRODUCTS_HAS_MODULES_PREFIX}${socxProduct.id}`;
    logSync('Step 2: GET', modulesUrl);
    const modulesResp = await axios.get(`${baseUrl}${modulesUrl}`, { timeout: 30000, headers });
    const modules = parseModulesResponse(modulesResp.data);
    if (isDev && modules.length > 0) {
      const first = modules[0];
      logSync('Step 2: sample entry keys:', Object.keys(first || {}).join(', '));
    }
    const byProductCode = new Map(); // product_code_upper -> first row (backward compat)
    const byProductCodeAndModule = new Map(); // product_code_upper -> Map(moduleId -> row)
    for (const m of modules) {
      const pc = m?.product_code ? String(m.product_code).trim() : '';
      const moduleId = getEntryModuleId(m);
      if (pc) {
        const pcUpper = pc.toUpperCase();
        if (!byProductCode.has(pcUpper)) byProductCode.set(pcUpper, m);
        if (!byProductCodeAndModule.has(pcUpper)) byProductCodeAndModule.set(pcUpper, new Map());
        if (moduleId != null) byProductCodeAndModule.get(pcUpper).set(moduleId, m);
      }
    }
    logSync('Step 2: modules:', modules.length, '| unik product_code:', byProductCode.size, '| selectedModuleIds:', selectedModuleIds);

    // Step 2b: ambil list suppliers_modules untuk supplier ini (untuk create entry baru)
    const modulesListUrl = `${SOCX_SUPPLIERS_MODULES_LIST_PREFIX}${supplierId}`;
    logSync('Step 2b: GET', modulesListUrl);
    const modulesListResp = await axios.get(`${baseUrl}${modulesListUrl}`, { timeout: 30000, headers });
    let suppliersModules = Array.isArray(modulesListResp.data) ? modulesListResp.data : [];
    if (selectedModuleIds != null && selectedModuleIds.length > 0) {
      const idSet = new Set(selectedModuleIds);
      suppliersModules = suppliersModules.filter((sm) => idSet.has(Number(sm.id)));
      logSync('Step 2b: filter by suppliers_module_ids', selectedModuleIds, '→', suppliersModules.length, 'modul');
      if (suppliersModules.length === 0) {
        return res.status(400).json({ success: false, message: 'Modul yang dipilih tidak ditemukan di daftar modul SOCX' });
      }
    } else {
      logSync('Step 2b: suppliers_modules:', suppliersModules.length, '(semua modul aktif)');
    }

    // Step 2c: Hapus entry OTF_* yang tidak ada di request (cleanup sebelum sync)
    const requestedCodes = new Set(list.map((p) => String(p.product_code || '').trim().toUpperCase()).filter(Boolean));
    const selectedIdSet = selectedModuleIds ? new Set(selectedModuleIds) : null;
    logSync('Step 2c/2d: requestedCodes:', [...requestedCodes], '| selectedIdSet:', selectedIdSet ? [...selectedIdSet] : 'null (semua modul)');
    const toDelete = modules.filter((m) => {
      const pc = String(m?.product_code || '').trim().toUpperCase();
      if (!pc.startsWith('OTF_') || requestedCodes.has(pc)) return false;
      if (selectedIdSet != null && !selectedIdSet.has(getEntryModuleId(m))) return false;
      return true;
    });
    let deletedCount = 0;
    if (toDelete.length > 0) {
      logSync('Step 2c: Hapus', toDelete.length, 'entry OTF_* yang tidak ada di request');
      for (const entry of toDelete) {
        const entryId = entry.id ?? entry.pk ?? entry.products_has_suppliers_modules_id;
        if (entryId == null) continue;
        const deleteUrl = `${baseUrl}/api/v1/products_has_suppliers_modules/${entryId}`;
        try {
          logSync('  DELETE', entry.id, '|', entry.product_code);
          await axios.delete(deleteUrl, { timeout: 30000, headers });
          deletedCount++;
          // Hapus juga dari modules array agar tidak diproses di Step 3
          const idx = modules.findIndex((m) => (m.id === entryId) || (m.id === entry.id));
          if (idx >= 0) modules.splice(idx, 1);
          // Update byProductCode juga (gunakan uppercase untuk konsisten)
          const pcUpper = entry.product_code ? String(entry.product_code).trim().toUpperCase() : '';
          if (pcUpper) byProductCode.delete(pcUpper);
        } catch (err) {
          logSync('  ERROR delete', entryId, ':', err.response?.status, err.response?.data?.message || err.message);
        }
      }
      logSync('Step 2c: Berhasil hapus', deletedCount, 'dari', toDelete.length, 'entry');
    } else {
      logSync('Step 2c: Tidak ada entry OTF_* yang perlu dihapus');
    }

    // Step 2d: Jika frontend mengirim hanya 1 (atau beberapa) modul terpilih: hapus hanya entry OTF_*
    // yang modulnya BUKAN yang dipilih. Kode non-OTF (selain OTF_*) di modul lain TIDAK dihapus,
    // supaya hanya OTF yang diselaraskan dengan modul terpilih; kode lain (mis. FIM1, RCRP) tetap aman.
    if (selectedIdSet != null) {
      const toDeleteOtherModules = modules.filter((m) => {
        const pc = String(m?.product_code || '').trim().toUpperCase();
        const mid = getEntryModuleId(m);
        const isOtf = pc.startsWith('OTF_');
        const notInSelectedModule = mid != null && !selectedIdSet.has(mid);
        const shouldDel = isOtf && notInSelectedModule;
        if (isDev) logSync('  2d check: id=', m.id, '| product_code:', pc, '| OTF:', isOtf, '| moduleId:', mid, '| in selected:', selectedIdSet.has(mid), '→ delete:', shouldDel);
        return shouldDel;
      });
      logSync('Step 2d: toDeleteOtherModules (hanya OTF_* di modul lain):', toDeleteOtherModules.length, '| selectedModuleIds:', selectedModuleIds);
      if (toDeleteOtherModules.length > 0) {
        logSync('Step 2d: Hapus', toDeleteOtherModules.length, 'entry OTF_* di modul lain (bukan', selectedModuleIds, ')');
        for (const entry of toDeleteOtherModules) {
          const entryId = entry.id ?? entry.pk ?? entry.products_has_suppliers_modules_id;
          if (entryId == null) {
            logSync('  SKIP delete: entry tanpa id', JSON.stringify(Object.keys(entry)));
            continue;
          }
          const deleteUrl = `${baseUrl}/api/v1/products_has_suppliers_modules/${entryId}`;
          try {
            logSync('  DELETE', deleteUrl);
            const delResp = await axios.delete(deleteUrl, { timeout: 30000, headers, validateStatus: () => true });
            if (delResp.status >= 200 && delResp.status < 300) {
              deletedCount++;
              logSync('  OK delete id:', entryId, '| status:', delResp.status);
            } else {
              logSync('  FAIL delete id:', entryId, '| status:', delResp.status, '| data:', JSON.stringify(delResp.data));
            }
            const idx = modules.findIndex((m) => (m.id === entryId) || (m.id === entry.id) || (m.pk === entryId));
            if (idx >= 0) modules.splice(idx, 1);
          } catch (err) {
            logSync('  ERROR delete', entryId, ':', err.response?.status, err.response?.data || err.message);
          }
        }
        byProductCode.clear();
        byProductCodeAndModule.clear();
        for (const m of modules) {
          const pc = m?.product_code ? String(m.product_code).trim() : '';
          const moduleId = getEntryModuleId(m);
          if (pc && moduleId != null) {
            const pcUpper = pc.toUpperCase();
            if (!byProductCode.has(pcUpper)) byProductCode.set(pcUpper, m);
            if (!byProductCodeAndModule.has(pcUpper)) byProductCodeAndModule.set(pcUpper, new Map());
            byProductCodeAndModule.get(pcUpper).set(moduleId, m);
          }
        }
        logSync('Step 2d: Selesai. Sisa modules:', modules.length, '| byProductCode:', byProductCode.size);
      }
    }

    // Step 3: update suppliers_products price jika beda, atau create entry baru jika tidak ada
    // Urutkan promos berdasarkan harga (murah → mahal) untuk priority yang benar
    const sortedPromos = [...list].sort((a, b) => {
      const amtA = Number(a?.product_amount || 0);
      const amtB = Number(b?.product_amount || 0);
      return amtA - amtB; // ascending: murah → mahal
    });
    logSync('Step 3: promos diurutkan berdasarkan harga (murah → mahal)');
    sortedPromos.forEach((p, i) => logSync('  urutan', i + 1, ':', p.product_code, '→', p.product_amount));

    // Hitung max priority yang sudah ada
    let maxPriority = 0;
    for (const m of modules) {
      if (m.priority && Number(m.priority) > maxPriority) maxPriority = Number(m.priority);
    }
    let nextPriority = maxPriority + 1;

    let matched = 0;
    let updatedSuppliers = 0;
    let skippedSuppliers = 0;
    let notFound = 0;
    let created = 0;
    let createdSuppliersProducts = 0;
    let maxPrice = 0;
    const details = [];

    logSync('Step 3: per promo × per modul terpilih — update jika ada, create jika belum');
    const activeSuppliersModules = suppliersModules.filter((sm) => sm.status === 1);
    for (const promo of sortedPromos) {
      const promoCode = promo?.product_code ? String(promo.product_code).trim() : '';
      const amount = Number(promo?.product_amount || 0);
      if (!promoCode) continue;
      const promoCodeUpper = promoCode.toUpperCase();
      matched++;
      if (amount > maxPrice) maxPrice = amount;

      const existingByModule = byProductCodeAndModule.get(promoCodeUpper) || new Map();
      let suppliersProductsId = null;
      const anyExisting = existingByModule.values().next().value;
      if (anyExisting) suppliersProductsId = anyExisting.suppliers_products_id;

      if (!suppliersProductsId) {
        try {
          const suppliersProductsUrl = `${SOCX_SUPPLIERS_PRODUCTS_LIST_PREFIX}${supplierId}`;
          const suppliersProductsResp = await axios.get(`${baseUrl}${suppliersProductsUrl}`, { timeout: 30000, headers });
          const suppliersProducts = Array.isArray(suppliersProductsResp.data) ? suppliersProductsResp.data : [];
          let supplierProduct = suppliersProducts.find((sp) => String(sp.code || '').trim().toUpperCase() === promoCodeUpper);
          if (!supplierProduct) {
            logSync('  ', promoCode, '→ buat suppliers_product baru');
            const createPayload = {
              name: promo?.product_name || promoCode,
              code: promoCode,
              parameters: JSON.stringify({ type: 'O4U' }),
              base_price: amount || 0,
              trx_per_day: 100,
              suppliers_id: supplierId,
              regex_custom_info: ''
            };
            const createResp = await axios.post(`${baseUrl}${SOCX_SUPPLIERS_PRODUCTS_CREATE}`, createPayload, { timeout: 30000, headers });
            supplierProduct = createResp.data;
            createdSuppliersProducts++;
          }
          suppliersProductsId = supplierProduct?.id;
        } catch (err) {
          logSync('  ', promoCode, '→ error get/create suppliers_product:', err.message);
          notFound++;
          details.push({ product_code: promoCode, status: 'error_suppliers_product', error: err.message });
          continue;
        }
      }

      let promoPriority = nextPriority;
      for (const sm of activeSuppliersModules) {
        const moduleId = Number(sm.id);
        const existingRow = existingByModule.get(moduleId);
        if (existingRow) {
          const suppliersId = existingRow.suppliers_products_id;
          const currentBase = Number(existingRow.base_price || 0);
          if (suppliersId && amount > 0 && currentBase !== amount) {
            logSync('  ', promoCode, '| module', sm.name, '→ update price', currentBase, '→', amount);
            await axios.post(`${baseUrl}${SOCX_UPDATE_SUPPLIERS_PRICE_ENDPOINT}`, { id: suppliersId, price: amount }, { timeout: 30000, headers });
            updatedSuppliers++;
            details.push({ product_code: promoCode, suppliers_modules_id: moduleId, module_name: sm.name, from: currentBase, to: amount, status: 'updated_suppliers' });
          } else {
            skippedSuppliers++;
            details.push({ product_code: promoCode, suppliers_modules_id: moduleId, module_name: sm.name, status: 'skipped_suppliers' });
          }
        } else {
          const createPayload = {
            products_id: socxProduct.id,
            products_code: code,
            product_code: promoCode,
            suppliers_products_id: suppliersProductsId,
            suppliers_modules_id: moduleId,
            status: 1,
            priority: promoPriority,
            pending_limit: 20
          };
          logSync('  ', promoCode, '| module', sm.name, '→ create entry');
          await axios.post(`${baseUrl}${SOCX_PRODUCTS_HAS_MODULES_CREATE}`, createPayload, { timeout: 30000, headers });
          created++;
          details.push({ product_code: promoCode, suppliers_modules_id: moduleId, module_name: sm.name, status: 'created' });
          promoPriority++;
        }
      }
      nextPriority += activeSuppliersModules.length;
    }
    logSync('Step 3: matched:', matched, '| updated_suppliers:', updatedSuppliers, '| skipped:', skippedSuppliers, '| created:', created, '| created_suppliers_products:', createdSuppliersProducts, '| not_found:', notFound, '| max_price:', maxPrice);

    // Step 3b: Urutkan ulang priority semua entry (OTF + non-OTF) berdasarkan harga: termurah = priority 1, termahal = terakhir.
    // Entry non-OTF (mis. IFR2, LMP) ikut diurutkan; yang mahal dapat priority terakhir. Pakai PATCH per entry yang berubah.
    let prioritiesUpdated = 0;
    try {
      const modulesRefetchResp = await axios.get(`${baseUrl}${SOCX_PRODUCTS_HAS_MODULES_PREFIX}${socxProduct.id}`, { timeout: 30000, headers });
      const allEntries = parseModulesResponse(modulesRefetchResp.data);
      if (allEntries.length > 0) {
        const byPriceAsc = [...allEntries].sort((a, b) => {
          const priceA = Number(a.base_price ?? 0);
          const priceB = Number(b.base_price ?? 0);
          return priceA - priceB;
        });
        logSync('Step 3b: Urutkan priority by price (murah → mahal), total entry:', byPriceAsc.length);
        for (let i = 0; i < byPriceAsc.length; i++) {
          const entry = byPriceAsc[i];
          const desiredPriority = i + 1;
          const currentPriority = entry.priority != null ? Number(entry.priority) : null;
          if (currentPriority !== desiredPriority) {
            const entryId = entry.id ?? entry.pk ?? entry.products_has_suppliers_modules_id;
            if (entryId != null) {
              const patchUrl = `${baseUrl}${SOCX_PRODUCTS_HAS_MODULES_PATCH_PREFIX}${entryId}`;
              const patchBody = {
                id: entryId,
                products_id: entry.products_id,
                products_code: entry.products_code ?? entry.product_code,
                suppliers_products_id: entry.suppliers_products_id,
                status: entry.status != null ? entry.status : 1,
                priority: desiredPriority,
                pending_limit: entry.pending_limit != null ? entry.pending_limit : 20,
                suppliers_modules_id: getEntryModuleId(entry)
              };
              const patchResp = await axios.patch(patchUrl, patchBody, { timeout: 30000, headers, validateStatus: () => true });
              if (patchResp.status >= 200 && patchResp.status < 300) {
                prioritiesUpdated++;
                logSync('  PATCH priority', entry.product_code || entryId, '→', desiredPriority);
              } else {
                logSync('  PATCH priority FAIL', entryId, '| status:', patchResp.status);
              }
            }
          }
        }
        logSync('Step 3b: priorities_updated:', prioritiesUpdated);
      }
    } catch (err) {
      logSync('Step 3b: Error reorder priority', err.message);
    }

    // Step 4: update products price dengan harga terbesar
    const currentProductPrice = Number(socxProduct.price || 0);
    let productPriceUpdated = false;
    logSync('Step 4: products/update_price | product id:', socxProduct.id, '| current:', currentProductPrice, '| max_price:', maxPrice);
    if (maxPrice > 0 && currentProductPrice !== maxPrice) {
      await axios.post(`${baseUrl}${SOCX_UPDATE_PRODUCTS_PRICE_ENDPOINT}`, { id: socxProduct.id, price: maxPrice }, { timeout: 30000, headers });
      productPriceUpdated = true;
      logSync('Step 4: updated product price', currentProductPrice, '→', maxPrice);
    } else {
      logSync('Step 4: skip (sama atau max_price 0)');
    }

    logSync('Selesai | deleted:', deletedCount, '| updated_suppliers:', updatedSuppliers, '| created:', created, '| priorities_updated:', prioritiesUpdated, '| product_price_updated:', productPriceUpdated);

    return res.json({
      success: true,
      socx_product: { id: socxProduct.id, code: socxProduct.code, name: socxProduct.name, price_before: currentProductPrice, price_after: productPriceUpdated ? maxPrice : currentProductPrice },
      summary: {
        input_promos: list.length,
        matched,
        deleted: deletedCount,
        not_found: notFound,
        updated_suppliers: updatedSuppliers,
        skipped_suppliers: skippedSuppliers,
        created,
        created_suppliers_products: createdSuppliersProducts,
        priorities_updated: prioritiesUpdated,
        max_price: maxPrice,
        product_price_updated: productPriceUpdated
      },
      details
    });
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const data = error.response?.data;
    let msg = data?.message || data?.error || error.message || 'Gagal sync harga ke SOCX';
    if (status === 401 && msg && /expired|invalid|jwt/i.test(String(msg))) {
      msg = 'SOCX token kadaluarsa atau tidak valid. Silakan perbarui SOCX Token di Pengaturan (Settings).';
    }
    console.error('Error syncIsimpleProductPrices:', msg);
    return res.status(status).json({ success: false, message: msg, error: msg, code: status === 401 ? 'SOCX_TOKEN_INVALID' : undefined });
  }
};

/**
 * GET list suppliers_modules untuk supplier tertentu (untuk dropdown Modul di Daftar Produk)
 * GET /api/socx/suppliers-modules/list/:supplierId
 * Response: array dari API suppliers_modules/list (id, name, uri, ...)
 */
exports.getSuppliersModulesList = async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'supplierId required', data: [] });
    }
    let baseUrl;
    let token;
    try {
      const auth = await getSocxAuth(req);
      baseUrl = auth.baseUrl;
      token = auth.token;
    } catch (authErr) {
      console.error('getSuppliersModulesList: auth error', authErr.message);
      return res.json({
        success: true,
        data: [],
        message: 'SOCX URL atau Token belum diatur. Atur di Pengaturan (Settings) agar daftar modul terisi.'
      });
    }
    const url = `${String(baseUrl).replace(/\/$/, '')}${SOCX_SUPPLIERS_MODULES_LIST_PREFIX}${supplierId}`;
    let response;
    try {
      response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
    } catch (socxErr) {
      console.error('getSuppliersModulesList: SOCX request failed', socxErr.message, socxErr.response?.status);
      return res.json({
        success: true,
        data: [],
        message: socxErr.response?.status === 401
          ? 'SOCX token tidak valid atau kadaluarsa. Perbarui di Pengaturan.'
          : 'Gagal memuat daftar modul dari SOCX. Cek URL dan koneksi.'
      });
    }
    const body = response.data;
    let raw = [];
    if (Array.isArray(body)) raw = body;
    else if (body && Array.isArray(body.data)) raw = body.data;
    else if (body && Array.isArray(body.list)) raw = body.list;
    const data = raw.map((m) => ({
      id: m.id,
      name: m.name || m.uri || `Modul ${m.id}`
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getSuppliersModulesList:', error.message);
    res.json({ success: true, data: [], message: 'Gagal mengambil daftar modul' });
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