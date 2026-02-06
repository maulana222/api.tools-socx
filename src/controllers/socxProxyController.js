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
 * Apply/order promo ke SOCX (msisdn + product_code).
 * Body: { msisdn, product_code, product_name?, product_amount? }
 */
exports.applyPromo = async (req, res) => {
  try {
    // NOTE: endpoint legacy (per promo) — tetap dipertahankan
    const { msisdn, product_code, product_name, product_amount } = req.body || {};
    if (!msisdn || !product_code) {
      return res.status(400).json({
        message: 'msisdn dan product_code wajib',
        error: 'msisdn dan product_code wajib',
        success: false
      });
    }

    const { baseUrl, token } = await getSocxAuth(req);

    const url = `${baseUrl}${SOCX_ORDER_ENDPOINT}`;
    // Payload sesuai format create suppliers_products
    const payload = {
      name: product_name || product_code,
      code: product_code,
      parameters: JSON.stringify({ type: 'O4U' }), // Format: JSON string '{"type":"O4U"}'
      base_price: product_amount || 0,
      trx_per_day: 100,
      suppliers_id: 35, // iSimple supplier ID di SOCX
      regex_custom_info: ''
    };
    // Tambahkan msisdn jika diperlukan untuk apply promo
    if (msisdn) payload.msisdn = msisdn;

    console.log('[Apply Promo] Request to SOCX:', url);
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
 * Body: { socx_code: "IF14", promos: [{ product_code, product_name?, product_amount }] }
 */
const isDev = process.env.NODE_ENV !== 'production';
const logSync = (...args) => { if (isDev) console.log('[SOCX Sync]', ...args); };

exports.syncIsimpleProductPrices = async (req, res) => {
  try {
    const { socx_code, promos, providers_id, categories_id, suppliers_id } = req.body || {};
    const code = socx_code != null ? String(socx_code).trim() : '';
    const list = Array.isArray(promos) ? promos : [];
    // Default: providers_id = 2 (Indosat), categories_id = 2 (data) — sesuai contoh dari SOCX
    const providerId = providers_id != null ? Number(providers_id) : 2;
    const categoryId = categories_id != null ? Number(categories_id) : 2;
    // suppliers_id untuk iSimple (default 35)
    const supplierId = suppliers_id != null ? Number(suppliers_id) : 35;
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
    const modules = Array.isArray(modulesResp.data) ? modulesResp.data : [];
    const byProductCode = new Map();
    for (const m of modules) {
      const pc = m?.product_code;
      if (pc && !byProductCode.has(pc)) byProductCode.set(pc, m);
    }
    logSync('Step 2: modules:', modules.length, '| unik product_code:', byProductCode.size);

    // Step 2b: ambil list suppliers_modules untuk supplier ini (untuk create entry baru)
    const modulesListUrl = `${SOCX_SUPPLIERS_MODULES_LIST_PREFIX}${supplierId}`;
    logSync('Step 2b: GET', modulesListUrl);
    const modulesListResp = await axios.get(`${baseUrl}${modulesListUrl}`, { timeout: 30000, headers });
    const suppliersModules = Array.isArray(modulesListResp.data) ? modulesListResp.data : [];
    logSync('Step 2b: suppliers_modules:', suppliersModules.length);

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

    logSync('Step 3: cek & update suppliers_products per promo (sorted by price)');
    for (const promo of sortedPromos) {
      const promoCode = promo?.product_code ? String(promo.product_code) : '';
      const amount = Number(promo?.product_amount || 0);
      if (!promoCode) continue;
      const moduleRow = byProductCode.get(promoCode);
      if (!moduleRow) {
        // Product code tidak ditemukan → perlu create entry baru di products_has_suppliers_modules
        logSync('  ', promoCode, '→ not_found, cari suppliers_products...');
        try {
          // Step 3a: cari suppliers_products_id dari suppliers_products/list/{supplier_id}
          const suppliersProductsUrl = `${SOCX_SUPPLIERS_PRODUCTS_LIST_PREFIX}${supplierId}`;
          logSync('    GET', suppliersProductsUrl);
          const suppliersProductsResp = await axios.get(`${baseUrl}${suppliersProductsUrl}`, { timeout: 30000, headers });
          const suppliersProducts = Array.isArray(suppliersProductsResp.data) ? suppliersProductsResp.data : [];
          let supplierProduct = suppliersProducts.find((sp) => String(sp.code || '').toUpperCase() === promoCode.toUpperCase());
          let suppliersProductsId;
          
          if (!supplierProduct) {
            // Product tidak ditemukan → buat baru di suppliers_products
            logSync('    suppliers_product tidak ditemukan untuk code:', promoCode, '→ membuat baru...');
            const promoName = promo?.product_name || promoCode;
            const createSupplierProductPayload = {
              name: promoName,
              code: promoCode,
              parameters: JSON.stringify({ type: 'O4U' }), // Format: JSON string '{"type":"O4U"}'
              base_price: amount || 0,
              trx_per_day: 100,
              suppliers_id: supplierId,
              regex_custom_info: ''
            };
            logSync('    POST', SOCX_SUPPLIERS_PRODUCTS_CREATE, '| payload:', JSON.stringify(createSupplierProductPayload));
            const createResp = await axios.post(`${baseUrl}${SOCX_SUPPLIERS_PRODUCTS_CREATE}`, createSupplierProductPayload, { timeout: 30000, headers });
            supplierProduct = createResp.data;
            suppliersProductsId = supplierProduct?.id;
            if (!suppliersProductsId) {
              logSync('    Error: suppliers_product created tapi tidak ada id di response');
              notFound++;
              details.push({ product_code: promoCode, status: 'error_create_suppliers_product', error: 'No id in response' });
              continue;
            }
            logSync('    suppliers_product dibuat | id:', suppliersProductsId, '| name:', promoName, '| base_price:', amount);
            createdSuppliersProducts++;
          } else {
            suppliersProductsId = supplierProduct.id;
            logSync('    suppliers_product ditemukan | id:', suppliersProductsId, '| name:', supplierProduct.name, '| base_price:', supplierProduct.base_price);
          }

          // Step 3b: create entry di products_has_suppliers_modules untuk setiap suppliers_modules
          // Priority berdasarkan urutan harga (murah → mahal), increment kecil per module dalam promo yang sama
          const promoPriority = nextPriority;
          let moduleOffset = 0;
          for (const sm of suppliersModules) {
            if (sm.status !== 1) continue; // skip jika module tidak aktif
            const finalPriority = promoPriority + moduleOffset;
            const createPayload = {
              products_id: socxProduct.id,
              products_code: code,
              product_code: promoCode,
              suppliers_products_id: suppliersProductsId,
              suppliers_modules_id: sm.id,
              status: 1,
              priority: finalPriority,
              pending_limit: 20
            };
            logSync('    POST products_has_suppliers_modules | module:', sm.name, '| priority:', finalPriority, '| harga:', amount);
            await axios.post(`${baseUrl}${SOCX_PRODUCTS_HAS_MODULES_CREATE}`, createPayload, { timeout: 30000, headers });
            created++;
            details.push({ product_code: promoCode, suppliers_products_id: suppliersProductsId, suppliers_modules_id: sm.id, status: 'created', priority: finalPriority });
            moduleOffset++;
          }
          // Increment priority untuk promo berikutnya (setelah semua module promo ini selesai)
          nextPriority += suppliersModules.filter(sm => sm.status === 1).length;
          matched++;
          if (amount > maxPrice) maxPrice = amount;
          logSync('    created', suppliersModules.length, 'entries untuk', promoCode);
        } catch (createErr) {
          console.error('Error create products_has_suppliers_modules:', createErr.message);
          notFound++;
          details.push({ product_code: promoCode, status: 'error_create', error: createErr.message });
          logSync('    error create:', createErr.message);
        }
        continue;
      }
      matched++;
      if (amount > maxPrice) maxPrice = amount;

      const suppliersId = moduleRow.suppliers_products_id;
      const currentBase = Number(moduleRow.base_price || 0);
      if (suppliersId && amount > 0 && currentBase !== amount) {
        logSync('  ', promoCode, '→ update suppliers_products id', suppliersId, '|', currentBase, '→', amount);
        await axios.post(`${baseUrl}${SOCX_UPDATE_SUPPLIERS_PRICE_ENDPOINT}`, { id: suppliersId, price: amount }, { timeout: 30000, headers });
        updatedSuppliers++;
        details.push({ product_code: promoCode, suppliers_products_id: suppliersId, from: currentBase, to: amount, status: 'updated_suppliers' });
      } else {
        skippedSuppliers++;
        details.push({ product_code: promoCode, suppliers_products_id: suppliersId, from: currentBase, to: amount, status: 'skipped_suppliers' });
        logSync('  ', promoCode, '→ skip (sama atau invalid) | id:', suppliersId, '| base:', currentBase, '| amount:', amount);
      }
    }
    logSync('Step 3: matched:', matched, '| updated_suppliers:', updatedSuppliers, '| skipped:', skippedSuppliers, '| created:', created, '| created_suppliers_products:', createdSuppliersProducts, '| not_found:', notFound, '| max_price:', maxPrice);

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

    logSync('Selesai | updated_suppliers:', updatedSuppliers, '| created:', created, '| product_price_updated:', productPriceUpdated);

    return res.json({
      success: true,
      socx_product: { id: socxProduct.id, code: socxProduct.code, name: socxProduct.name, price_before: currentProductPrice, price_after: productPriceUpdated ? maxPrice : currentProductPrice },
      summary: {
        input_promos: list.length,
        matched,
        not_found: notFound,
        updated_suppliers: updatedSuppliers,
        skipped_suppliers: skippedSuppliers,
        created_suppliers_products: createdSuppliersProducts,
        max_price: maxPrice,
        product_price_updated: productPriceUpdated
      },
      details
    });
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const data = error.response?.data;
    const msg = data?.message || data?.error || error.message || 'Gagal sync harga ke SOCX';
    console.error('Error syncIsimpleProductPrices:', msg);
    return res.status(status).json({ success: false, message: msg, error: msg });
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