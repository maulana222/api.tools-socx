const axios = require('axios');
const Settings = require('../models/Settings');
const TriNumber = require('../models/TriNumber');
const TriPromoProduct = require('../models/TriPromoProduct');
const db = require('../config/database');

const TRI_RITA_TASK = { id: 57, name: 'rita', task: 'special_offer' };
const TRI_PROMO_CONCURRENCY = 20;
const TRI_PROMO_CHUNK_DELAY_MS = 200;

/** Progress cek promo Tri (untuk polling frontend) */
let progressCheckAllTri = { status: 'idle', total: 0, processed: 0, currentNumber: null, currentIndex: 0, startedAt: null, errorMessage: null };
let shouldStopCheckAllTri = false;

/** Jika status 'running' lebih dari ini (ms), dianggap macet dan boleh mulai lagi */
const TRI_CHECK_ALL_STALE_MS = 15 * 60 * 1000; // 15 menit

/**
 * Parse list paket dari response SOCX Tri Rita.
 * Format: { status, message, code, data: [ { offerId, offerShortDesc, productPrice, netPrice, registrationKey, validity, ... } ] }
 */
function parseTriRitaList(response) {
  if (!response || !response.data) return [];
  const d = response.data;
  if (d.data && Array.isArray(d.data)) return d.data;
  if (Array.isArray(d)) return d;
  if (d.data && d.data.data && Array.isArray(d.data.data)) return d.data.data;
  return [];
}

/**
 * Cek satu nomor ke SOCX Tri Rita (special_offer)
 */
async function fetchTriRitaForNumber(msisdn, baseUrl, token) {
  const url = `${baseUrl}/api/v1/suppliers_modules/task`;
  const body = { ...TRI_RITA_TASK, payload: { msisdn } };
  try {
    const response = await axios.post(url, body, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return parseTriRitaList(response);
  } catch (err) {
    console.error('[SOCX Tri Rita] Error cek nomor', msisdn, '|', err.message);
    return [];
  }
}

/**
 * Ambil daftar nomor dari rita_phones, sinkron ke tri_numbers (batch), return array tri_number rows.
 * Untuk 35k+ nomor dipakai sync bulk agar tidak timeout/error (bukan getOrCreate per baris).
 */
async function getNumbersFromRitaPhones(projectId) {
  const phones = await db.query('SELECT id, phone_number FROM rita_phones ORDER BY id ASC');
  const list = Array.isArray(phones) ? phones : [];
  const phoneList = list.map((p) => (p.phone_number || p.phoneNumber || '').trim()).filter(Boolean);
  if (phoneList.length === 0) return [];
  return TriNumber.syncFromPhoneList(projectId, phoneList);
}

/**
 * Proses satu tri_number: request SOCX Tri Rita, simpan hasil ke tri_promo_products.
 */
async function processOneTriNumber(row, baseUrl, token, now) {
  const msisdn = row.number;
  const triNumberId = row.id;
  try {
    const list = await fetchTriRitaForNumber(msisdn, baseUrl, token);
    await TriPromoProduct.replaceByTriNumberId(triNumberId, list);
    await TriNumber.updateStatus(triNumberId, 'processed', list.length, now);
  } catch (err) {
    console.error('[SOCX Tri Rita] Error cek nomor', msisdn, '|', err.message);
    try {
      await TriPromoProduct.deleteByTriNumberId(triNumberId);
      await TriNumber.updateStatus(triNumberId, 'failed', 0, now);
    } catch (cleanupErr) {
      console.error('[SOCX Tri Rita] Cleanup error untuk', msisdn, '|', cleanupErr.message);
    }
  }
}

/**
 * POST /api/tri-promo-check/check-all
 * Body: { project_id }
 * Sumber nomor: rita_phones (fallback tri_numbers untuk project). Simpan hasil ke tri_numbers + tri_promo_products.
 */
exports.checkAllPromoByProject = async (req, res) => {
  try {
    const nowTs = Date.now();
    if (progressCheckAllTri.status === 'running') {
      const startedAt = progressCheckAllTri.startedAt || 0;
      if (nowTs - startedAt > TRI_CHECK_ALL_STALE_MS) {
        progressCheckAllTri.status = 'idle';
        progressCheckAllTri.startedAt = null;
        progressCheckAllTri.currentNumber = null;
      } else {
        return res.status(409).json({
          success: false,
          started: false,
          message: 'Proses cek promo Tri masih berjalan. Tunggu selesai atau klik Stop dulu.',
          total: progressCheckAllTri.total,
          processed: progressCheckAllTri.processed
        });
      }
    }

    const projectId = req.body?.project_id ?? req.query?.project_id;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

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
        message: 'SOCX token tidak ditemukan. Set token di Pengaturan (Settings).'
      });
    }

    progressCheckAllTri.status = 'running';
    progressCheckAllTri.startedAt = Date.now();
    progressCheckAllTri.total = 0;
    progressCheckAllTri.processed = 0;
    progressCheckAllTri.currentNumber = null;
    progressCheckAllTri.currentIndex = 0;
    progressCheckAllTri.errorMessage = null;
    shouldStopCheckAllTri = false;

    // Respond immediately (seperti Isimple) agar tidak timeout saat getNumbers lama (rita_phones banyak + getOrCreate per baris)
    res.status(200).json({
      success: true,
      started: true,
      message: 'Proses cek promo Tri dimulai. Gunakan GET /check-all/progress untuk progress.',
      total: null
    });

    setImmediate(async () => {
      let numbers;
      try {
        console.log('[SOCX Tri Rita] Background: memuat daftar nomor dari rita_phones...');
        numbers = await getNumbersFromRitaPhones(projectId);
        if (!numbers || numbers.length === 0) {
          console.log('[SOCX Tri Rita] rita_phones kosong, fallback ke tri_numbers project', projectId);
          numbers = await TriNumber.getByProject(projectId);
        }
      } catch (err) {
        console.error('Error get numbers for Tri check-all:', err);
        progressCheckAllTri.status = 'error';
        progressCheckAllTri.errorMessage = err.message || 'Gagal memuat daftar nomor dari rita_phones.';
        progressCheckAllTri.startedAt = null;
        progressCheckAllTri.total = 0;
        return;
      }

      if (!numbers || numbers.length === 0) {
        console.log('[SOCX Tri Rita] Tidak ada nomor (rita_phones + tri_numbers kosong). Status di-set idle.');
        progressCheckAllTri.status = 'idle';
        progressCheckAllTri.startedAt = null;
        progressCheckAllTri.total = 0;
        progressCheckAllTri.errorMessage = null;
        return;
      }

      console.log('[SOCX Tri Rita] Dapat', numbers.length, 'nomor, mulai cek ke SOCX.');

      const total = numbers.length;
      progressCheckAllTri.total = total;
      progressCheckAllTri.processed = 0;
      progressCheckAllTri.currentNumber = null;
      progressCheckAllTri.currentIndex = 0;

      let processed = 0;
      const now = new Date();
      const chunkSize = Math.max(1, TRI_PROMO_CONCURRENCY);

      try {
        for (let start = 0; start < numbers.length; start += chunkSize) {
          if (shouldStopCheckAllTri) {
            console.log('[SOCX Tri Rita] Proses dihentikan oleh user.');
            progressCheckAllTri.status = 'stopped';
            break;
          }
          const chunk = numbers.slice(start, start + chunkSize);
          console.log('[SOCX Tri Rita] Batch', Math.floor(start / chunkSize) + 1, '| nomor', start + 1, '-', start + chunk.length, '/', total);

          await Promise.all(
            chunk.map(row => processOneTriNumber(row, baseUrl, token, now))
          );

          processed += chunk.length;
          progressCheckAllTri.processed = processed;
          progressCheckAllTri.currentIndex = start + chunk.length;
          progressCheckAllTri.currentNumber = chunk[chunk.length - 1]?.number ?? null;

          if (start + chunkSize < numbers.length && TRI_PROMO_CHUNK_DELAY_MS > 0) {
            await new Promise(r => setTimeout(r, TRI_PROMO_CHUNK_DELAY_MS));
          }
        }

        console.log('[SOCX Tri Rita] Selesai:', processed, '/', total);
      } catch (err) {
        console.error('Error run loop checkAllPromo Tri:', err);
      } finally {
        if (progressCheckAllTri.status !== 'stopped') progressCheckAllTri.status = 'idle';
        progressCheckAllTri.currentNumber = null;
        progressCheckAllTri.startedAt = null;
      }
    });
  } catch (error) {
    console.error('Error checkAllPromoByProject Tri:', error);
    progressCheckAllTri.status = 'idle';
    progressCheckAllTri.startedAt = null;
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat pengecekan promo Tri'
    });
  }
};

/** GET /api/tri-promo-check/check-all/progress */
exports.getProgress = (req, res) => {
  res.json({
    success: true,
    ...progressCheckAllTri
  });
};

/** POST /api/tri-promo-check/check-all/stop */
exports.stopCheck = (req, res) => {
  shouldStopCheckAllTri = true;
  res.json({
    success: true,
    message: 'Permintaan stop diterima. Proses akan berhenti setelah nomor saat ini selesai.'
  });
};

/**
 * POST /api/tri-promo-check/check
 * Body: { numbers: string[] }
 * Backend memanggil SOCX untuk tiap nomor, mengembalikan hasil gabungan.
 */
exports.checkTriRita = async (req, res) => {
  try {
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
        message: 'SOCX token tidak ditemukan. Set token di Pengaturan (Settings).'
      });
    }

    const raw = req.body?.numbers;
    const numbers = Array.isArray(raw)
      ? raw.map((n) => String(n).trim()).filter(Boolean)
      : typeof raw === 'string'
        ? raw.split(/\n/).map((n) => n.trim()).filter(Boolean)
        : [];
    if (numbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Daftar nomor kosong. Kirim array numbers atau string (satu nomor per baris).'
      });
    }

    const results = [];
    const chunkSize = Math.max(1, TRI_PROMO_CONCURRENCY);

    for (let start = 0; start < numbers.length; start += chunkSize) {
      const chunk = numbers.slice(start, start + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (nomor) => {
          const paketList = await fetchTriRitaForNumber(nomor, baseUrl, token);
          return { nomor, paketList };
        })
      );
      results.push(...chunkResults);
      if (start + chunkSize < numbers.length && TRI_PROMO_CHUNK_DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, TRI_PROMO_CHUNK_DELAY_MS));
      }
    }

    res.json({
      success: true,
      data: {
        results,
        totalNumbers: results.length,
        totalPaket: results.reduce((sum, r) => sum + (r.paketList?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error checkTriRita:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat pengecekan Tri Rita'
    });
  }
};
