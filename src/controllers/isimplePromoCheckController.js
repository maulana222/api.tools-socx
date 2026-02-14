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
/** Retry saat deadlock: maksimal percobaan */
const DEADLOCK_RETRY_MAX = 3;
/** Jeda sebelum retry (ms) */
const DEADLOCK_RETRY_DELAY_MS = 150;

/** Cek apakah error dari DB adalah deadlock (MySQL: ER_LOCK_DEADLOCK = 121) */
function isDeadlockError(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  if (/deadlock/i.test(msg)) return true;
  if (err && (err.errno === 121 || err.code === 'ER_LOCK_DEADLOCK')) return true;
  return false;
}

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
 * Jika terjadi deadlock DB, otomatis retry sampai DEADLOCK_RETRY_MAX kali.
 */
async function processOneIsimpleNumber(row, baseUrl, token, taskPayload, now) {
  const msisdn = row.number;
  const isimpleNumberId = row.id;
  const url = `${baseUrl}/api/v1/suppliers_modules/task`;
  const body = { ...taskPayload, payload: { msisdn } };
  let lastError;
  for (let attempt = 1; attempt <= DEADLOCK_RETRY_MAX; attempt++) {
    try {
      const response = await axios.post(url, body, {
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const list = parsePromoList(response);
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
        await PromoProduct.upsertBatch(isimpleNumberId, products);
      }
      const packetCount = await PromoProduct.countByIsimpleNumberId(isimpleNumberId);
      await IsimpleNumber.updateStatus(isimpleNumberId, 'processed', packetCount, now);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < DEADLOCK_RETRY_MAX && isDeadlockError(err)) {
        const delay = DEADLOCK_RETRY_DELAY_MS + Math.floor(Math.random() * 100);
        console.warn('[SOCX] Deadlock cek promo', msisdn, '| retry', attempt, '/', DEADLOCK_RETRY_MAX, 'setelah', delay, 'ms');
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.error('[SOCX] Error cek promo', msisdn, '|', err.message);
      try {
        await IsimpleNumber.updateStatus(isimpleNumberId, 'failed', 0, now);
      } catch (cleanupErr) {
        if (isDeadlockError(cleanupErr)) {
          console.warn('[SOCX] Deadlock saat update status failed untuk', msisdn, '|', cleanupErr.message);
        } else {
          console.error('[SOCX] Cleanup error untuk', msisdn, '|', cleanupErr.message);
        }
      }
      return;
    }
  }
  if (lastError) {
    console.error('[SOCX] Error cek promo setelah retry', msisdn, '|', lastError.message);
  }
}

/**
 * Ambil daftar nomor dari isimple_phones saja (tanpa menyalin ke isimple_numbers).
 * Dipakai untuk alur: cek nomor ke SOCX dulu, baru tambah satu per satu ke isimple_numbers.
 */
async function getPhoneListFromIsimplePhones() {
  const phones = await db.query('SELECT id, phone_number FROM isimple_phones ORDER BY id ASC');
  const list = Array.isArray(phones) ? phones : [];
  return list
    .map((p) => p.phone_number || p.phoneNumber)
    .filter(Boolean);
}

/**
 * Proses satu nomor dari isimple_phones: cek ke SOCX dulu, lalu getOrCreate isimple_numbers dan simpan hasil.
 * Jadi isimple_numbers hanya diisi setelah nomor dicek, bukan disalin semua dulu.
 */
async function processOnePhoneFromIsimplePhones(phoneNumber, projectId, baseUrl, token, taskPayload, now) {
  const url = `${baseUrl}/api/v1/suppliers_modules/task`;
  const body = { ...taskPayload, payload: { msisdn: phoneNumber } };
  let lastError;
  for (let attempt = 1; attempt <= DEADLOCK_RETRY_MAX; attempt++) {
    try {
      const response = await axios.post(url, body, {
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const list = parsePromoList(response);
      const row = await IsimpleNumber.getOrCreate(projectId, phoneNumber);
      const isimpleNumberId = row.id;
      if (list.length > 0) {
        const products = list.map(p => ({
          productName: p.name,
          productCode: p.dnmcode || phoneNumber,
          productAmount: p.amount ?? 0,
          productType: p.type,
          productTypeTitle: p.typetitle ?? p.name,
          productCommission: p.commision ?? 0,
          productGb: p.gb ?? p.product_gb ?? 0,
          productDays: p.days ?? p.product_days ?? 0
        }));
        await PromoProduct.upsertBatch(isimpleNumberId, products);
      }
      const packetCount = await PromoProduct.countByIsimpleNumberId(isimpleNumberId);
      await IsimpleNumber.updateStatus(isimpleNumberId, 'processed', packetCount, now);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < DEADLOCK_RETRY_MAX && isDeadlockError(err)) {
        const delay = DEADLOCK_RETRY_DELAY_MS + Math.floor(Math.random() * 100);
        console.warn('[SOCX] Deadlock cek promo', phoneNumber, '| retry', attempt, '/', DEADLOCK_RETRY_MAX);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.error('[SOCX] Error cek promo', phoneNumber, '|', err.message);
      try {
        const row = await IsimpleNumber.getOrCreate(projectId, phoneNumber);
        await IsimpleNumber.updateStatus(row.id, 'failed', 0, now);
      } catch (cleanupErr) {
        if (isDeadlockError(cleanupErr)) {
          console.warn('[SOCX] Deadlock saat update status failed untuk', phoneNumber);
        } else {
          console.error('[SOCX] Cleanup error untuk', phoneNumber, '|', cleanupErr.message);
        }
      }
      return;
    }
  }
  if (lastError) {
    console.error('[SOCX] Error cek promo setelah retry', phoneNumber, '|', lastError.message);
  }
}

/**
 * Cek promo: ambil nomor dari isimple_phones, request SOCX satu per satu, simpan hasil ke promo_products
 * Body/query: project_id (opsional, default 1) untuk menyimpan hasil di project mana
 */
const checkAllPromoByProject = async (req, res) => {
  try {
    // Cegah double-klik: jika proses cek promo masih berjalan (atau masih menyiapkan daftar nomor), tolak request baru
    if (progressCheckAll.status === 'running') {
      return res.status(409).json({
        success: false,
        started: false,
        message: 'Proses cek promo masih berjalan. Tunggu selesai atau klik "Hentikan" dulu.',
        total: progressCheckAll.total,
        processed: progressCheckAll.processed
      });
    }

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

    // Tandai "running" sejak awal supaya klik kedua tidak masuk (sambil daftar nomor diambil dari DB)
    progressCheckAll.status = 'running';
    progressCheckAll.total = 0;
    progressCheckAll.processed = 0;
    progressCheckAll.currentNumber = null;
    progressCheckAll.currentIndex = 0;

    // Sumber nomor: isimple_phones. Alur: cek nomor ke SOCX dulu, baru tambah satu per satu ke isimple_numbers.
    let phoneList = await getPhoneListFromIsimplePhones();
    let numbersFromProject = [];
    if (!phoneList || phoneList.length === 0) {
      // Fallback: nomor yang sudah ada di isimple_numbers (project ini) — proses seperti biasa (row sudah ada).
      numbersFromProject = await IsimpleNumber.getByProject(projectId);
      if (!numbersFromProject || numbersFromProject.length === 0) {
        progressCheckAll.status = 'idle';
        return res.status(200).json({
          success: true,
          message: 'Tidak ada nomor. Isi tabel isimple_phones (Kelola nomor sample) atau tambah nomor di project lewat "Tambah Produk".',
          total: 0,
          processed: 0
        });
      }
    }

    const total = phoneList.length > 0 ? phoneList.length : numbersFromProject.length;
    shouldStopCheckAll = false;
    progressCheckAll.total = total;
    progressCheckAll.processed = 0;
    progressCheckAll.currentNumber = null;
    progressCheckAll.currentIndex = 0;

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
        if (phoneList.length > 0) {
          // Alur baru: dari isimple_phones → cek SOCX dulu → baru getOrCreate isimple_numbers dan simpan hasil.
          for (let start = 0; start < phoneList.length; start += chunkSize) {
            if (shouldStopCheckAll) {
              console.log('[SOCX] Proses dihentikan oleh user.');
              progressCheckAll.status = 'stopped';
              break;
            }
            const chunk = phoneList.slice(start, start + chunkSize);
            console.log('[SOCX] Batch', Math.floor(start / chunkSize) + 1, '| nomor', start + 1, '-', start + chunk.length, '/', total);

            await Promise.all(
              chunk.map(phoneNumber => processOnePhoneFromIsimplePhones(phoneNumber, projectId, baseUrl, token, taskPayload, now))
            );

            processed += chunk.length;
            progressCheckAll.processed = processed;
            progressCheckAll.currentIndex = start + chunk.length;
            progressCheckAll.currentNumber = chunk[chunk.length - 1] ?? null;

            if (start + chunkSize < phoneList.length && ISIMPLE_PROMO_CHUNK_DELAY_MS > 0) {
              await new Promise(r => setTimeout(r, ISIMPLE_PROMO_CHUNK_DELAY_MS));
            }
          }
        } else {
          // Fallback: proses row isimple_numbers yang sudah ada (per project).
          for (let start = 0; start < numbersFromProject.length; start += chunkSize) {
            if (shouldStopCheckAll) {
              console.log('[SOCX] Proses dihentikan oleh user.');
              progressCheckAll.status = 'stopped';
              break;
            }
            const chunk = numbersFromProject.slice(start, start + chunkSize);
            console.log('[SOCX] Batch', Math.floor(start / chunkSize) + 1, '| nomor', start + 1, '-', start + chunk.length, '/', total);

            await Promise.all(
              chunk.map(row => processOneIsimpleNumber(row, baseUrl, token, taskPayload, now))
            );

            processed += chunk.length;
            progressCheckAll.processed = processed;
            progressCheckAll.currentIndex = start + chunk.length;
            progressCheckAll.currentNumber = chunk[chunk.length - 1]?.number ?? null;

            if (start + chunkSize < numbersFromProject.length && ISIMPLE_PROMO_CHUNK_DELAY_MS > 0) {
              await new Promise(r => setTimeout(r, ISIMPLE_PROMO_CHUNK_DELAY_MS));
            }
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
 * checkAllPromoByProject: sumber nomor dari isimple_phones. Alur: cek nomor ke SOCX dulu, baru getOrCreate isimple_numbers dan simpan hasil (tidak salin semua isimple_phones ke isimple_numbers dulu).
 * Fallback jika isimple_phones kosong: pakai nomor yang sudah ada di isimple_numbers per project.
 */
const checkAllPromo = async (req, res) => checkAllPromoByProject(req, res);

module.exports = {
  checkAllPromo,
  checkAllPromoByProject,
  getProgress,
  stopCheck
};
