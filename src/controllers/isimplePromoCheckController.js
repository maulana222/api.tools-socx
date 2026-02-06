const axios = require('axios');
const Settings = require('../models/Settings');
const IsimpleNumber = require('../models/IsimpleNumber');
const PromoProduct = require('../models/PromoProduct');
const db = require('../config/database');

/** Progress cek promo (untuk polling frontend): { status, total, processed, currentNumber, currentIndex } */
let progressCheckAll = { status: 'idle', total: 0, processed: 0, currentNumber: null, currentIndex: 0 };
/** Flag untuk hentikan proses cek (dipakai saat user klik Stop) */
let shouldStopCheckAll = false;

/** Konkurensi: berapa nomor dicek sekaligus ke SOCX (percepat tanpa overload API) */
const ISIMPLE_PROMO_CONCURRENCY = 20;
/** Jeda antar batch (ms) */
const ISIMPLE_PROMO_CHUNK_DELAY_MS = 200;

/**
 * Parse list dari response SOCX task hot_promo (format bisa bervariasi)
 */
function parsePromoList(response) {
  if (!response || !response.data) return [];
  const d = response.data;
  if (d.data && Array.isArray(d.data.list)) return d.data.list;
  if (Array.isArray(d.list)) return d.list;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d)) return d;
  return [];
}

/**
 * Proses satu nomor: request SOCX hot_promo, simpan/update hasil ke DB.
 * Dipanggil paralel per batch; tangkap error per nomor agar satu gagal tidak hentikan batch.
 */
async function processOneIsimpleNumber(row, baseUrl, token, taskPayload, now) {
  const msisdn = row.number;
  const isimpleNumberId = row.id;
  const url = `${baseUrl}/api/v1/suppliers_modules/task`;
  const body = { ...taskPayload, payload: { msisdn } };
  try {
    const response = await axios.post(url, body, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const list = parsePromoList(response);
    await PromoProduct.deleteByIsimpleNumberId(isimpleNumberId);
    if (list.length > 0) {
      const products = list.map(p => ({
        productName: p.name,
        productCode: p.dnmcode || msisdn,
        productAmount: p.amount ?? 0,
        productType: p.type,
        productTypeTitle: p.typetitle ?? p.name,
        productCommission: p.commision ?? 0,
        productGb: p.gb ?? p.product_gb ?? 0,
        productDays: p.days ?? p.product_days ?? 0
      }));
      await PromoProduct.createBatch(isimpleNumberId, products);
    }
    await IsimpleNumber.updateStatus(isimpleNumberId, 'processed', list.length, now);
  } catch (err) {
    console.error('[SOCX] Error cek promo', msisdn, '|', err.message);
    await PromoProduct.deleteByIsimpleNumberId(isimpleNumberId);
    await IsimpleNumber.updateStatus(isimpleNumberId, 'failed', 0, now);
  }
}

/**
 * Ambil daftar nomor dari isimple_phones (untuk diproses satu per satu).
 * Pakai getOrCreate: jika nomor sudah ada di isimple_numbers maka pakai row itu (update nanti), bukan tambah duplikat.
 */
async function getNumbersFromIsimplePhones(projectId = 1) {
  const phones = await db.query('SELECT id, phone_number FROM isimple_phones ORDER BY id ASC');
  const list = Array.isArray(phones) ? phones : [];
  const numbers = [];
  for (const p of list) {
    const num = p.phone_number || p.phoneNumber;
    if (num) {
      const row = await IsimpleNumber.getOrCreate(projectId, num);
      numbers.push(row);
    }
  }
  return numbers;
}

/**
 * Cek promo: ambil nomor dari isimple_phones, request SOCX satu per satu, simpan hasil ke promo_products
 * Body/query: project_id (opsional, default 1) untuk menyimpan hasil di project mana
 */
const checkAllPromoByProject = async (req, res) => {
  try {
    const projectId = req.body?.project_id ?? req.query?.project_id ?? 1;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';
    const token = tokenSetting?.value;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'SOCX token tidak ditemukan. Set token di Settings.'
      });
    }

    // Sumber nomor: isimple_phones (lalu disinkron ke isimple_numbers untuk simpan hasil)
    let numbers = await getNumbersFromIsimplePhones(projectId);
    if (!numbers || numbers.length === 0) {
      // Fallback: nomor dari isimple_numbers per project
      numbers = await IsimpleNumber.getByProject(projectId);
    }
    if (!numbers || numbers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada nomor. Isi tabel isimple_phones (nomor telepon) atau tambah nomor di project lewat "Tambah Produk".',
        total: 0,
        processed: 0
      });
    }

    const total = numbers.length;
    shouldStopCheckAll = false;
    progressCheckAll = { status: 'running', total, processed: 0, currentNumber: null, currentIndex: 0 };

    res.status(200).json({
      success: true,
      started: true,
      message: 'Proses cek promo dimulai. Gunakan endpoint GET /progress untuk melihat progress.',
      total
    });

    setImmediate(async () => {
      let processed = 0;
      const now = new Date();
      const taskPayload = { id: 40, name: 'isimple', task: 'hot_promo' };
      const chunkSize = Math.max(1, ISIMPLE_PROMO_CONCURRENCY);

      try {
        for (let start = 0; start < numbers.length; start += chunkSize) {
          if (shouldStopCheckAll) {
            console.log('[SOCX] Proses dihentikan oleh user.');
            progressCheckAll.status = 'stopped';
            break;
          }
          const chunk = numbers.slice(start, start + chunkSize);
          console.log('[SOCX] Batch', Math.floor(start / chunkSize) + 1, '| nomor', start + 1, '-', start + chunk.length, '/', total);

          await Promise.all(
            chunk.map(row => processOneIsimpleNumber(row, baseUrl, token, taskPayload, now))
          );

          processed += chunk.length;
          progressCheckAll.processed = processed;
          progressCheckAll.currentIndex = start + chunk.length;
          progressCheckAll.currentNumber = chunk[chunk.length - 1]?.number ?? null;

          if (start + chunkSize < numbers.length && ISIMPLE_PROMO_CHUNK_DELAY_MS > 0) {
            await new Promise(r => setTimeout(r, ISIMPLE_PROMO_CHUNK_DELAY_MS));
          }
        }

        console.log('[SOCX] Selesai:', processed, '/', total);
      } catch (err) {
        console.error('Error run loop checkAllPromo:', err);
      } finally {
        if (progressCheckAll.status !== 'stopped') progressCheckAll.status = 'idle';
        progressCheckAll.currentNumber = null;
      }
    });
  } catch (error) {
    console.error('Error checkAllPromoByProject:', error);
    progressCheckAll.status = 'idle';
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat pengecekan promo'
    });
  }
};

const getProgress = (req, res) => {
  res.json({
    success: true,
    ...progressCheckAll
  });
};

/** Hentikan proses cek promo yang sedang berjalan (flag dicek di dalam loop). */
const stopCheck = (req, res) => {
  shouldStopCheckAll = true;
  res.json({
    success: true,
    message: 'Permintaan stop diterima. Proses akan berhenti setelah nomor saat ini selesai.'
  });
};

/**
 * Entry point: selalu delegasi ke checkAllPromoByProject.
 * checkAllPromoByProject mengambil nomor dari isimple_phones (fallback isimple_numbers), request SOCX per batch paralel (ISIMPLE_PROMO_CONCURRENCY).
 * Setiap nomor: data yang sudah ada di-update (hapus promo lama lalu simpan hasil terbaru), bukan ditambah duplikat.
 */
const checkAllPromo = async (req, res) => checkAllPromoByProject(req, res);

module.exports = {
  checkAllPromo,
  checkAllPromoByProject,
  getProgress,
  stopCheck
};
